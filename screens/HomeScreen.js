import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { getQuestions } from '../lib/db';

const CATEGORIES = [
  'Ogun State Challenge',
  'Nigeria Challenge',
  'Sports Challenge',
  'Music Challenge',
  'Student Challenge',
  'Geography Challenge',
  'Bible Challenge',
  'AI & Technology',
];

const DIFFICULTIES = [
  { label: 'Easy',   value: 'Easy',   prize: '₦500'   },
  { label: 'Medium', value: 'Medium', prize: '₦1,000' },
  { label: 'Hard',   value: 'Hard',   prize: '₦2,000' },
  { label: 'Mixed',  value: 'Mixed',  prize: 'All'    },
];

const SESSION_TYPES = [
  { label: 'Fill in the Gap', value: 'fitg' },
  { label: 'MCQ',             value: 'mcq'  },
];

// SF-style ALL CAPS section label
function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

export default function HomeScreen({ navigation }) {
  const [category, setCategory]   = useState('All');
  const [type, setType]           = useState('fitg');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [count, setCount]         = useState(null); // null = loading

  useEffect(() => {
    setCount(null);
    getQuestions(
      category === 'All' ? null : category,
      difficulty,
      type,
    )
      .then(rows => setCount(rows.length))
      .catch(() => setCount(0));
  }, [category, type, difficulty]);

  const activePrize = DIFFICULTIES.find(d => d.value === difficulty)?.prize;

  const canStart = count !== null && count > 0;

  function handleStart() {
    if (!canStart) return;
    navigation.navigate('Quiz', { category, sessionType: type, difficulty });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appTitle}>QuizStreet NG</Text>
              <Text style={styles.appSub}>Set up your session</Text>
            </View>
            <TouchableOpacity
              style={styles.manageLink}
              onPress={() => navigation.navigate('Manage')}
              accessibilityRole="button"
              accessibilityLabel="Manage questions"
            >
              <Text style={styles.manageLinkLabel}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Category ── */}
        <SectionLabel text="CATEGORY" />
        <View style={styles.grid}>
          {/* All option */}
          <CategoryCard
            label="All Categories"
            prize={activePrize}
            selected={category === 'All'}
            onPress={() => setCategory('All')}
          />
          {CATEGORIES.map(cat => (
            <CategoryCard
              key={cat}
              label={cat}
              prize={activePrize}
              selected={category === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </View>

        {/* ── Session Type ── */}
        <SectionLabel text="SESSION TYPE" />
        <View style={styles.segRow}>
          {SESSION_TYPES.map(t => {
            const sel = type === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.segBtn, sel && styles.segBtnSel]}
                onPress={() => setType(t.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={t.label}
              >
                <Text style={[styles.segLabel, sel && styles.segLabelSel]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Difficulty ── */}
        <SectionLabel text="DIFFICULTY" />
        <View style={styles.diffRow}>
          {DIFFICULTIES.map(d => {
            const sel = difficulty === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.diffBtn, sel && styles.diffBtnSel]}
                onPress={() => setDifficulty(d.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${d.label}, ${d.prize}`}
              >
                <Text style={[styles.diffName, sel && styles.diffNameSel]}>
                  {d.label}
                </Text>
                <Text style={[styles.diffPrize, sel && styles.diffPrizeSel]}>
                  {d.prize}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Question Count ── */}
        <View style={styles.countBox}>
          {count === null ? (
            <ActivityIndicator color={C.primary} size="large" />
          ) : (
            <>
              <Text style={styles.countNum}>{count}</Text>
              <Text style={styles.countCaption}>questions available</Text>
            </>
          )}
        </View>

        {/* ── Start Button ── */}
        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startBtnOff]}
          onPress={handleStart}
          disabled={!canStart}
          accessibilityRole="button"
          accessibilityLabel={
            canStart
              ? `Start session — ${count} questions`
              : 'No questions available'
          }
          accessibilityState={{ disabled: !canStart }}
        >
          <Text style={[styles.startLabel, !canStart && styles.startLabelOff]}>
            {count === 0 ? 'No Questions Available' : 'Start Session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryCard({ label, prize, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSel]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text
        style={[styles.cardName, selected && styles.cardNameSel]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {prize && prize !== 'All' && (
        <Text style={styles.cardPrize}>{prize}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:          '#0A0A0A',
  surface:     '#1A1A1A',
  surfaceSel:  '#0A2A15',  // deep green tint — SF dark-selected idiom
  primary:     '#00C853',
  gold:        '#FFD700',
  text:        '#FFFFFF',
  textSec:     '#8E8E93',  // iOS system secondary label
  border:      '#2C2C2E',  // iOS system separator
  borderSel:   '#00C853',
};

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  // Header
  header:      { paddingTop: 16, paddingBottom: 28 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  appTitle:    { color: C.gold, fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  appSub:      { color: C.textSec, fontSize: 15, marginTop: 4 },
  manageLink:  { paddingBottom: 4 },
  manageLinkLabel: { color: C.textSec, fontSize: 14, fontWeight: '500' },

  // Section label — SF Caption / ALL CAPS
  sectionLabel: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 12,
  },

  // Category grid — 2-column with gap
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  card: {
    width: '48.5%',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    minHeight: 76,
    justifyContent: 'space-between',
  },
  cardSel:      { backgroundColor: C.surfaceSel, borderColor: C.borderSel },
  cardName:     { color: C.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cardNameSel:  { color: C.primary },
  cardPrize:    { color: C.gold, fontSize: 12, fontWeight: '600', marginTop: 6 },

  // Session type segmented control
  segRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnSel:   { backgroundColor: C.surfaceSel, borderColor: C.borderSel },
  segLabel:    { color: C.text, fontSize: 15, fontWeight: '600' },
  segLabelSel: { color: C.primary },

  // Difficulty row
  diffRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  diffBtnSel:   { backgroundColor: C.surfaceSel, borderColor: C.borderSel },
  diffName:     { color: C.text, fontSize: 13, fontWeight: '600' },
  diffNameSel:  { color: C.primary },
  diffPrize:    { color: C.textSec, fontSize: 11, fontWeight: '500', marginTop: 3 },
  diffPrizeSel: { color: C.gold },

  // Count display
  countBox: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  countNum:     { color: C.primary, fontSize: 52, fontWeight: '700', lineHeight: 60 },
  countCaption: { color: C.textSec, fontSize: 14, marginTop: 4 },

  // Start button
  startBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnOff:   { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  startLabel:    { color: '#0A0A0A', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  startLabelOff: { color: C.textSec },
});
