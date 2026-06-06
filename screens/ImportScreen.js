import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { importQuestions } from '../lib/db';

const VALID_CATS  = new Set(['Ogun State Challenge','Nigeria Challenge','Sports Challenge',
  'Music Challenge','Student Challenge','Geography Challenge','Bible Challenge','AI & Technology']);
const VALID_DIFFS = new Set(['Easy','Medium','Hard']);
const VALID_TYPES = new Set(['fitg','mcq']);
const HEADERS = 'category,difficulty,type,question,answer,option_a,option_b,option_c,option_d,prize';
const TEMPLATE = HEADERS + '\n' +
  'Nigeria Challenge,Easy,fitg,What is the capital of Nigeria?,Abuja,,,,, ₦500\n' +
  'Sports Challenge,Medium,mcq,Who won the 2018 FIFA World Cup?,France,France,Brazil,Germany,Argentina,₦1000\n';

const C = { bg:'#0A0A0A', surface:'#1A1A1A', surfaceSel:'#0A2A15', primary:'#00C853',
  gold:'#FFD700', text:'#FFFFFF', textSec:'#8E8E93', border:'#2C2C2E', danger:'#FF3B30' };

function parseCSVLine(line) {
  const fields = []; let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n').filter(l => l.trim());
  const valid = [], errors = [];
  for (let i = 1; i < lines.length; i++) {
    const [cat, diff, type, question, answer, oA, oB, oC, oD, prize] = parseCSVLine(lines[i]);
    const rowNum = i + 1;
    if (!cat || !diff || !type || !question?.trim() || !answer?.trim() || !prize?.trim()) {
      errors.push(`Row ${rowNum}: missing required field`); continue;
    }
    if (!VALID_CATS.has(cat))  { errors.push(`Row ${rowNum}: unknown category "${cat}"`); continue; }
    if (!VALID_DIFFS.has(diff)){ errors.push(`Row ${rowNum}: invalid difficulty "${diff}"`); continue; }
    if (!VALID_TYPES.has(type)){ errors.push(`Row ${rowNum}: invalid type "${type}"`); continue; }
    valid.push({ category: cat, difficulty: diff, type, question: question.trim(),
      answer: answer.trim(), prize: prize.trim(),
      option_a: oA || null, option_b: oB || null, option_c: oC || null, option_d: oD || null });
  }
  return { valid, errors };
}

export default function ImportScreen() {
  const [parsed,    setParsed]    = useState(null);
  const [importing, setImporting] = useState(false);
  const [imported,  setImported]  = useState(null);

  const handleTemplate = async () => {
    try {
      const path = FileSystem.cacheDirectory + 'quizstreet_template.csv';
      await FileSystem.writeAsStringAsync(path, TEMPLATE, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Save template CSV' });
      } else {
        Alert.alert('Sharing not available', `Template saved to:\n${path}`);
      }
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handlePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      setParsed(parseCSV(text));
      setImported(null);
    } catch (e) { Alert.alert('Error reading file', e.message); }
  };

  const handleImport = async () => {
    if (!parsed?.valid?.length) return;
    setImporting(true);
    try {
      const result = await importQuestions(parsed.valid);
      setImported(result.imported);
      setParsed(null);
    } catch (e) {
      Alert.alert('Import failed', e.message);
    } finally { setImporting(false); }
  };

  const preview = parsed?.valid?.slice(0, 5) ?? [];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <Text style={s.title}>Import Questions</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={s.card}>
          <Text style={s.cardTitle}>CSV COLUMN ORDER</Text>
          <Text style={s.mono}>{HEADERS}</Text>
          <Text style={s.hint}>• Required: category, difficulty, type, question, answer, prize</Text>
          <Text style={s.hint}>• Options A–D are optional for fitg questions</Text>
          <Text style={s.hint}>• Difficulty: Easy | Medium | Hard</Text>
          <Text style={s.hint}>• Type: fitg | mcq</Text>
        </View>

        <TouchableOpacity style={s.templateBtn} onPress={handleTemplate}>
          <Text style={s.templateBtnLabel}>Export Template CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.pickBtn} onPress={handlePick}>
          <Text style={s.pickBtnLabel}>Select CSV File</Text>
        </TouchableOpacity>

        {/* Success banner */}
        {imported !== null && (
          <View style={s.successBox}>
            <Text style={s.successText}>{imported} questions imported successfully</Text>
          </View>
        )}

        {/* Preview */}
        {parsed && (
          <>
            <Text style={s.sectionLabel}>
              PREVIEW — {parsed.valid.length} valid · {parsed.errors.length} skipped
            </Text>

            {preview.map((row, i) => (
              <View key={i} style={s.previewRow}>
                <View style={s.rowBadges}>
                  <Text style={s.catBadge}>{row.category.replace(' Challenge','')}</Text>
                  <Text style={s.diffBadge}>{row.difficulty}</Text>
                  <Text style={s.typeBadge}>{row.type.toUpperCase()}</Text>
                </View>
                <Text style={s.previewQ} numberOfLines={2}>{row.question}</Text>
                <Text style={s.previewA}>→ {row.answer}</Text>
              </View>
            ))}
            {parsed.valid.length > 5 && (
              <Text style={s.moreText}>+{parsed.valid.length - 5} more rows…</Text>
            )}

            {parsed.errors.length > 0 && (
              <View style={s.errBox}>
                <Text style={s.errTitle}>{parsed.errors.length} row{parsed.errors.length !== 1 ? 's' : ''} skipped</Text>
                {parsed.errors.slice(0, 4).map((e, i) => (
                  <Text key={i} style={s.errLine}>{e}</Text>
                ))}
                {parsed.errors.length > 4 && (
                  <Text style={s.errLine}>…and {parsed.errors.length - 4} more</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[s.importBtn, (!parsed.valid.length || importing) && s.importBtnOff]}
              onPress={handleImport}
              disabled={!parsed.valid.length || importing}
            >
              <Text style={s.importBtnLabel}>
                {importing ? 'Importing…' : `Import ${parsed.valid.length} Questions`}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:20, paddingVertical:14,
    borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:C.border },
  back:  { color:C.primary, fontSize:17 },
  title: { color:C.text, fontSize:17, fontWeight:'700' },
  scroll: { paddingHorizontal:20, paddingBottom:48 },
  card:  { backgroundColor:C.surface, borderRadius:12, borderWidth:1, borderColor:C.border, padding:16, marginTop:24 },
  cardTitle: { color:C.textSec, fontSize:12, fontWeight:'600', letterSpacing:1.5, marginBottom:10 },
  mono:  { color:C.primary, fontSize:11, fontFamily:'monospace', marginBottom:10 },
  hint:  { color:C.textSec, fontSize:13, lineHeight:20 },
  templateBtn: { marginTop:16, backgroundColor:C.surface, borderWidth:1, borderColor:C.gold,
    borderRadius:12, paddingVertical:14, alignItems:'center' },
  templateBtnLabel: { color:C.gold, fontSize:15, fontWeight:'600' },
  pickBtn: { marginTop:12, backgroundColor:C.primary, borderRadius:12, paddingVertical:18, alignItems:'center' },
  pickBtnLabel: { color:C.bg, fontSize:17, fontWeight:'700' },
  successBox: { marginTop:20, backgroundColor:C.surfaceSel, borderWidth:1, borderColor:C.primary,
    borderRadius:12, padding:16 },
  successText: { color:C.primary, fontSize:16, fontWeight:'600', textAlign:'center' },
  sectionLabel: { color:C.textSec, fontSize:12, fontWeight:'600', letterSpacing:1.5, marginTop:28, marginBottom:12 },
  previewRow: { backgroundColor:C.surface, borderRadius:10, padding:14, marginBottom:8,
    borderWidth:1, borderColor:C.border },
  rowBadges: { flexDirection:'row', gap:8, marginBottom:6 },
  catBadge:  { color:C.textSec, fontSize:11, fontWeight:'600' },
  diffBadge: { color:C.primary, fontSize:11, fontWeight:'700' },
  typeBadge: { color:C.textSec, fontSize:11, fontWeight:'600' },
  previewQ:  { color:C.text, fontSize:14, fontWeight:'500', lineHeight:20 },
  previewA:  { color:C.primary, fontSize:13, marginTop:4 },
  moreText:  { color:C.textSec, fontSize:13, textAlign:'center', paddingVertical:8 },
  errBox:  { backgroundColor:'#1A0505', borderWidth:1, borderColor:C.danger, borderRadius:10,
    padding:14, marginBottom:12 },
  errTitle: { color:C.danger, fontSize:13, fontWeight:'700', marginBottom:6 },
  errLine:  { color:'#FF8A80', fontSize:12, lineHeight:18 },
  importBtn: { backgroundColor:C.primary, borderRadius:12, paddingVertical:18, alignItems:'center', marginTop:8 },
  importBtnOff: { backgroundColor:C.surface, borderWidth:1, borderColor:C.border },
  importBtnLabel: { color:C.bg, fontSize:17, fontWeight:'700' },
});
