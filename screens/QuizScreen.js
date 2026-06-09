import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { getQuestions, markQuestionUsed } from '../lib/db';
import { C } from '../lib/theme';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Session Complete ────────────────────────────────────────────────────────
function SessionComplete({ usedCount, total, onHome }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.completeCtr}>
        <Text style={styles.completeEmoji}>🎉</Text>
        <Text style={styles.completeTitle}>Session Complete</Text>
        <View style={styles.completeStats}>
          <Stat label="Questions seen" value={total} />
          <Stat label="Marked used"    value={usedCount} />
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={onHome} accessibilityRole="button">
          <Text style={styles.homeBtnLabel}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── MCQ Option Card ─────────────────────────────────────────────────────────
function OptionCard({ letter, text, revealed, isCorrect }) {
  const correct = revealed && isCorrect;
  return (
    <View style={[styles.optionCard, correct && styles.optionCardCorrect]}>
      <Text style={[styles.optionLetter, correct && styles.optionLetterCorrect]}>
        {letter}
      </Text>
      <Text style={[styles.optionText, correct && styles.optionTextCorrect]} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

// ── Main QuizScreen ─────────────────────────────────────────────────────────
export default function QuizScreen({ route, navigation }) {
  const { category, sessionType, difficulty } = route.params;

  const [questions, setQuestions]   = useState([]);
  const [index, setIndex]           = useState(0);
  const [history, setHistory]       = useState([]); // previous indices for retrieve
  const [revealed, setRevealed]     = useState(false);
  const [usedCount, setUsedCount]   = useState(0);
  const [complete, setComplete]     = useState(false);
  const [loading, setLoading]       = useState(true);

  // Load + shuffle on mount
  useEffect(() => {
    getQuestions(
      category === 'All' ? null : category,
      difficulty,
      sessionType,
    )
      .then(rows => {
        setQuestions(shuffle(rows));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const current = questions[index];
  const remaining = questions.length - index;

  const goNext = useCallback(() => {
    setRevealed(false);
    if (index + 1 >= questions.length) {
      setComplete(true);
    } else {
      setHistory(h => [...h, index]);
      setIndex(i => i + 1);
    }
  }, [index, questions.length]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    // Move current to end of remaining queue
    setQuestions(prev => {
      const next = [...prev];
      const [skipped] = next.splice(index, 1);
      next.push(skipped);
      return next;
    });
    setRevealed(false);
    // index stays the same — next question slides in
  }, [current, index]);

  const handleMarkUsed = useCallback(async () => {
    if (!current) return;
    await markQuestionUsed(current.id).catch(() => {});
    setUsedCount(c => c + 1);
    goNext();
  }, [current, goNext]);

  const handleRetrieve = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIndex(prev);
    setRevealed(false);
  }, [history]);

  const handleEnd = () => {
    Alert.alert(
      'End Session',
      'End this session and return home?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={[styles.textSec, { textAlign: 'center', marginTop: 60 }]}>
          Loading questions…
        </Text>
      </SafeAreaView>
    );
  }

  if (complete || questions.length === 0) {
    return (
      <SessionComplete
        usedCount={usedCount}
        total={index}
        onHome={() => navigation.goBack()}
      />
    );
  }

  const isMCQ = sessionType === 'mcq';
  const options = current
    ? [current.option_a, current.option_b, current.option_c, current.option_d]
    : [];
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.categoryTag} numberOfLines={1}>{category}</Text>
        <View style={styles.topRight}>
          <Text style={styles.remaining}>{remaining} left</Text>
          <TouchableOpacity
            onPress={handleEnd}
            accessibilityLabel="End session"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.endBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Prize Badge ── */}
        <View style={styles.prizeBadge}>
          <Text style={styles.prizeText}>{current?.prize ?? ''}</Text>
        </View>

        {/* ── Question ── */}
        <Text style={styles.questionText}>{current?.question ?? ''}</Text>

        {/* ── MCQ Options ── */}
        {isMCQ && options.some(Boolean) && (
          <View style={styles.optionsGrid}>
            {options.map((opt, i) =>
              opt ? (
                <OptionCard
                  key={i}
                  letter={letters[i]}
                  text={opt}
                  revealed={revealed}
                  isCorrect={opt === current?.answer}
                />
              ) : null,
            )}
          </View>
        )}

        {/* ── Reveal Button ── */}
        {!revealed && (
          <TouchableOpacity
            style={styles.revealBtn}
            onPress={() => setRevealed(true)}
            accessibilityRole="button"
            accessibilityLabel="Reveal answer"
          >
            <Text style={styles.revealLabel}>Reveal Answer</Text>
          </TouchableOpacity>
        )}

        {/* ── Answer (fitg only — MCQ uses card highlights) ── */}
        {revealed && !isMCQ && (
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>ANSWER</Text>
            <Text style={styles.answerText}>{current?.answer ?? ''}</Text>
          </View>
        )}

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <ActionBtn label="Skip"      onPress={handleSkip}    color={C.textSec} />
          <ActionBtn label="Mark Used" onPress={handleMarkUsed} color={C.danger} />
          <ActionBtn label="Next →"    onPress={goNext}        color={C.primary} primary />
        </View>

        {/* ── Retrieve ── */}
        <TouchableOpacity
          style={styles.retrieveRow}
          onPress={handleRetrieve}
          disabled={history.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Retrieve last question"
          accessibilityState={{ disabled: history.length === 0 }}
        >
          <Text style={[styles.retrieveLabel, history.length === 0 && styles.retrieveLabelOff]}>
            ← Retrieve Last Question
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionBtn({ label, onPress, color, primary }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, primary && styles.actionBtnPrimary]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.actionLabel, { color: primary ? C.bg : color }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.surface },
  textSec:      { color: C.textSec, fontSize: 16 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  categoryTag: { color: C.textSec, fontSize: 13, fontWeight: '600', flex: 1 },
  topRight:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  remaining:   { color: C.primary, fontSize: 13, fontWeight: '700' },
  endBtn:      { color: C.textSec, fontSize: 18, fontWeight: '400' },

  // Prize badge
  prizeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1500',
    borderWidth: 1,
    borderColor: '#3D3200',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 24,
    marginBottom: 16,
  },
  prizeText: { color: C.gold, fontSize: 13, fontWeight: '700' },

  // Question
  questionText: {
    color: C.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 28,
  },

  // MCQ options
  optionsGrid: { gap: 10, marginBottom: 24 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  optionCardCorrect: { backgroundColor: C.surfaceSel, borderColor: C.primary },
  optionLetter:      { color: C.textSec, fontSize: 17, fontWeight: '700', width: 24 },
  optionLetterCorrect: { color: C.primary },
  optionText:        { color: C.text, fontSize: 16, fontWeight: '500', flex: 1, lineHeight: 22 },
  optionTextCorrect: { color: C.primary },

  // Reveal button
  revealBtn: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  revealLabel: { color: '#0A0A0A', fontSize: 17, fontWeight: '700' },

  // Answer (fitg)
  answerBox: {
    backgroundColor: C.surfaceSel,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  answerLabel: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  answerText: { color: C.primary, fontSize: 26, fontWeight: '700', lineHeight: 34 },

  // Action row
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  actionBtnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  actionLabel:      { fontSize: 14, fontWeight: '700' },

  // Retrieve
  retrieveRow:     { alignItems: 'center', paddingVertical: 8 },
  retrieveLabel:   { color: C.textSec, fontSize: 14, fontWeight: '500' },
  retrieveLabelOff: { opacity: 0.3 },

  // Session Complete
  completeCtr: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  completeEmoji: { fontSize: 52 },
  completeTitle: { color: C.text, fontSize: 28, fontWeight: '700' },
  completeStats: { flexDirection: 'row', gap: 32, marginTop: 8 },
  statBox:       { alignItems: 'center' },
  statValue:     { color: C.primary, fontSize: 36, fontWeight: '700' },
  statLabel:     { color: C.textSec, fontSize: 13, marginTop: 4 },
  homeBtn: {
    marginTop: 24,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  homeBtnLabel: { color: C.bg, fontSize: 17, fontWeight: '700' },
});
