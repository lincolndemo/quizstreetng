import { useState, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { addQuestion, updateQuestion } from '../lib/db';

const CATS = [
  'Ogun State Challenge', 'Nigeria Challenge', 'Sports Challenge',
  'Music Challenge', 'Student Challenge', 'Geography Challenge',
  'Bible Challenge', 'AI & Technology',
];
const DIFFS  = ['Easy', 'Medium', 'Hard'];
const PRIZES = { Easy: '₦500', Medium: '₦1,000', Hard: '₦2,000' };

const C = {
  bg: '#0A0A0A', surface: '#1A1A1A', surfaceSel: '#0A2A15',
  primary: '#00C853', gold: '#FFD700', text: '#FFFFFF',
  textSec: '#8E8E93', border: '#2C2C2E',
};

function Field({ label, children }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function AddEditModal({ visible, question, onClose, onSaved }) {
  const isEdit = !!question?.id;

  const [cat,   setCat]   = useState(CATS[0]);
  const [diff,  setDiff]  = useState('Easy');
  const [type,  setType]  = useState('fitg');
  const [q,     setQ]     = useState('');
  const [ans,   setAns]   = useState('');
  const [prize, setPrize] = useState(PRIZES.Easy);
  const [optA,  setOptA]  = useState('');
  const [optB,  setOptB]  = useState('');
  const [optC,  setOptC]  = useState('');
  const [optD,  setOptD]  = useState('');

  useEffect(() => {
    if (!visible) return;
    if (question) {
      setCat(question.category);   setDiff(question.difficulty);
      setType(question.type);      setQ(question.question);
      setAns(question.answer);     setPrize(question.prize);
      setOptA(question.option_a || ''); setOptB(question.option_b || '');
      setOptC(question.option_c || ''); setOptD(question.option_d || '');
    } else {
      setCat(CATS[0]); setDiff('Easy'); setType('fitg');
      setQ(''); setAns(''); setPrize(PRIZES.Easy);
      setOptA(''); setOptB(''); setOptC(''); setOptD('');
    }
  }, [visible, question]);

  const onDiff = (d) => { setDiff(d); setPrize(PRIZES[d]); };

  const handleSave = async () => {
    if (!q.trim() || !ans.trim() || !prize.trim()) {
      Alert.alert('Missing fields', 'Question, answer and prize are required.');
      return;
    }
    if (type === 'mcq' && (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim())) {
      Alert.alert('Missing fields', 'All four MCQ options are required.');
      return;
    }
    const data = {
      category: cat, difficulty: diff, type,
      question: q.trim(), answer: ans.trim(), prize: prize.trim(),
      option_a: type === 'mcq' ? optA.trim() : null,
      option_b: type === 'mcq' ? optB.trim() : null,
      option_c: type === 'mcq' ? optC.trim() : null,
      option_d: type === 'mcq' ? optD.trim() : null,
    };
    try {
      if (isEdit) await updateQuestion(question.id, data);
      else        await addQuestion(data);
      onSaved();
    } catch (e) {
      Alert.alert('Save failed', e.message);
    }
  };

  const inp = (val, set, ph, multi = false) => (
    <TextInput
      style={[s.input, multi && s.inputMulti]}
      value={val}
      onChangeText={set}
      placeholder={ph}
      placeholderTextColor={C.textSec}
      multiline={multi}
      numberOfLines={multi ? 4 : 1}
      textAlignVertical={multi ? 'top' : 'auto'}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.mHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.mTitle}>{isEdit ? 'Edit Question' : 'Add Question'}</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.save}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          <Field label="CATEGORY">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATS.map(c => (
                <TouchableOpacity key={c} style={[s.chip, cat === c && s.chipSel]} onPress={() => setCat(c)}>
                  <Text style={[s.chipL, cat === c && s.chipLSel]}>{c.replace(' Challenge', '')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Field label="DIFFICULTY">
            <View style={s.row}>
              {DIFFS.map(d => (
                <TouchableOpacity key={d} style={[s.seg, diff === d && s.segSel]} onPress={() => onDiff(d)}>
                  <Text style={[s.segL, diff === d && s.segLSel]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="TYPE">
            <View style={s.row}>
              {[['fitg', 'Fill in Gap'], ['mcq', 'MCQ']].map(([v, l]) => (
                <TouchableOpacity key={v} style={[s.seg, type === v && s.segSel]} onPress={() => setType(v)}>
                  <Text style={[s.segL, type === v && s.segLSel]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="QUESTION">{inp(q, setQ, 'Enter question text…', true)}</Field>
          <Field label="ANSWER">{inp(ans, setAns, 'Correct answer')}</Field>
          <Field label="PRIZE">{inp(prize, setPrize, '₦500')}</Field>

          {type === 'mcq' && (
            <>
              <Field label="OPTION A">{inp(optA, setOptA, 'Option A')}</Field>
              <Field label="OPTION B">{inp(optB, setOptB, 'Option B')}</Field>
              <Field label="OPTION C">{inp(optC, setOptC, 'Option C')}</Field>
              <Field label="OPTION D">{inp(optD, setOptD, 'Option D')}</Field>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  mHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  mTitle:  { color: C.text, fontSize: 17, fontWeight: '700' },
  cancel:  { color: C.textSec, fontSize: 17 },
  save:    { color: C.primary, fontSize: 17, fontWeight: '700' },
  scroll:  { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
  field:      { marginTop: 24 },
  fieldLabel: { color: C.textSec, fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipSel:  { backgroundColor: C.surfaceSel, borderColor: C.primary },
  chipL:    { color: C.textSec, fontSize: 13, fontWeight: '600' },
  chipLSel: { color: C.primary },
  row:     { flexDirection: 'row', gap: 8 },
  seg:     { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  segSel:  { backgroundColor: C.surfaceSel, borderColor: C.primary },
  segL:    { color: C.textSec, fontSize: 14, fontWeight: '600' },
  segLSel: { color: C.primary },
  input:   {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: C.text, fontSize: 16,
  },
  inputMulti: { minHeight: 100 },
});
