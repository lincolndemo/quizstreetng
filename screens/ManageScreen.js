import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Alert,
} from 'react-native';
import { getAllQuestions, deleteQuestion } from '../lib/db';
import AddEditModal from '../components/AddEditModal';

const CATS = [
  'All', 'Ogun State Challenge', 'Nigeria Challenge', 'Sports Challenge',
  'Music Challenge', 'Student Challenge', 'Geography Challenge',
  'Bible Challenge', 'AI & Technology',
];
const DIFFS = [
  { label: 'All', value: 'Mixed' },
  { label: 'Easy', value: 'Easy' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Hard', value: 'Hard' },
];
const DIFF_COLOR = { Easy: '#00C853', Medium: '#FF9500', Hard: '#FF3B30' };

const C = {
  bg: '#0A0A0A', surface: '#1A1A1A', surfaceSel: '#0A2A15',
  primary: '#00C853', gold: '#FFD700', text: '#FFFFFF',
  textSec: '#8E8E93', border: '#2C2C2E', danger: '#FF3B30',
};

export default function ManageScreen({ navigation }) {
  const [questions, setQuestions] = useState([]);
  const [cat, setCat]   = useState('All');
  const [diff, setDiff] = useState('Mixed');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    getAllQuestions(cat === 'All' ? null : cat, diff)
      .then(setQuestions)
      .catch(() => {});
  }, [cat, diff]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (item) => {
    Alert.alert(
      'Delete this question?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteQuestion(item.id).catch(() => {});
            load();
          },
        },
      ],
    );
  };

  const openAdd  = () => { setEditing(null); setModalVisible(true); };
  const openEdit = (item) => { setEditing(item); setModalVisible(true); };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item)}
      accessibilityRole="button"
      accessibilityLabel={`Edit: ${item.question}`}
      accessibilityHint="Double-tap to edit, hold to delete"
    >
      <View style={styles.badges}>
        <Text style={[styles.diffBadge, { color: DIFF_COLOR[item.difficulty] ?? C.textSec }]}>
          {item.difficulty.toUpperCase()}
        </Text>
        <Text style={styles.typeBadge}>{item.type.toUpperCase()}</Text>
        {item.used === 1 && <Text style={styles.usedBadge}>USED</Text>}
      </View>
      <Text style={styles.catText}>{item.category}</Text>
      <Text style={styles.preview} numberOfLines={2}>{item.question}</Text>
    </TouchableOpacity>
  );

  const ListHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {CATS.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, cat === c && styles.chipSel]}
            onPress={() => setCat(c)}
          >
            <Text style={[styles.chipLabel, cat === c && styles.chipLabelSel]}>
              {c === 'All' ? 'All' : c.replace(' Challenge', '')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>DIFFICULTY</Text>
      <View style={styles.diffRow}>
        {DIFFS.map(d => (
          <TouchableOpacity
            key={d.value}
            style={[styles.diffBtn, diff === d.value && styles.diffBtnSel]}
            onPress={() => setDiff(d.value)}
          >
            <Text style={[styles.diffLabel, diff === d.value && styles.diffLabelSel]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.countLine}>{questions.length} question{questions.length !== 1 ? 's' : ''}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Questions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Import')} style={styles.importLink}>
            <Text style={styles.importLinkLabel}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnLabel}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No questions match these filters.</Text>
        }
      />

      <AddEditModal
        visible={modalVisible}
        question={editing}
        onClose={() => setModalVisible(false)}
        onSaved={() => { setModalVisible(false); load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  title:    { color: C.text, fontSize: 17, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  importLink:    { paddingHorizontal: 4 },
  importLinkLabel: { color: C.textSec, fontSize: 14, fontWeight: '500' },
  addBtn:   { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnLabel: { color: '#0A0A0A', fontSize: 14, fontWeight: '700' },
  listContent: { paddingBottom: 40 },
  listHeader:  { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionLabel: {
    color: C.textSec, fontSize: 12, fontWeight: '600',
    letterSpacing: 1.5, marginBottom: 10, marginTop: 4,
  },
  chipScroll: { marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipSel:      { backgroundColor: C.surfaceSel, borderColor: C.primary },
  chipLabel:    { color: C.textSec, fontSize: 13, fontWeight: '600' },
  chipLabelSel: { color: C.primary },
  diffRow:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
  diffBtn:    { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  diffBtnSel: { backgroundColor: C.surfaceSel, borderColor: C.primary },
  diffLabel:  { color: C.textSec, fontSize: 13, fontWeight: '600' },
  diffLabelSel: { color: C.primary },
  countLine:  { color: C.textSec, fontSize: 13, marginBottom: 8 },
  row:     { paddingHorizontal: 20, paddingVertical: 14 },
  badges:  { flexDirection: 'row', gap: 8, marginBottom: 4 },
  diffBadge: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  typeBadge: { color: C.textSec, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  usedBadge: { color: '#FF9500', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  catText:  { color: C.textSec, fontSize: 12, marginBottom: 4 },
  preview:  { color: C.text, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  sep:      { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 20 },
  empty:    { color: C.textSec, textAlign: 'center', marginTop: 48, fontSize: 15 },
});
