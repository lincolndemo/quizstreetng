import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { getStatsByCategory, resetCategoryUsed } from '../lib/db';

const C = {
  bg: '#0A0A0A', surface: '#1A1A1A', surfaceSel: '#0A2A15',
  primary: '#00C853', gold: '#FFD700', text: '#FFFFFF',
  textSec: '#8E8E93', border: '#2C2C2E', danger: '#FF3B30',
  track: '#2C2C2E',
};

function ProgressBar({ used, total }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct}%` }]} />
    </View>
  );
}

function CategoryCard({ row, onReset }) {
  const used      = row.used_count || 0;
  const total     = row.total || 0;
  const remaining = total - used;
  const lastUsed  = row.last_used ? row.last_used.slice(0, 10) : null;

  const handleReset = () => {
    Alert.alert(
      'Reset used status?',
      `Mark all ${row.category} questions as unused?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onReset },
      ],
    );
  };

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.catName}>{row.category}</Text>
        <TouchableOpacity
          style={s.resetBtn}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel={`Reset used status for ${row.category}`}
        >
          <Text style={s.resetLabel}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar used={used} total={total} />

      <View style={s.statsRow}>
        <Text style={s.statMain}>
          <Text style={s.statUsed}>{used}</Text>
          <Text style={s.statOf}> / {total}</Text>
        </Text>
        <Text style={s.remaining}>{remaining} remaining</Text>
      </View>

      <Text style={s.lastUsed}>
        {lastUsed ? `Last used ${lastUsed}` : 'Never used'}
      </Text>
    </View>
  );
}

export default function StatsScreen({ navigation }) {
  const [stats,   setStats]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getStatsByCategory()
      .then(rows => { setStats(rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = async (category) => {
    await resetCategoryUsed(category).catch(() => {});
    load();
  };

  const totals = stats.reduce(
    (acc, r) => ({
      total:     acc.total     + (r.total      || 0),
      used:      acc.used      + (r.used_count  || 0),
      remaining: acc.remaining + (r.total - (r.used_count || 0)),
    }),
    { total: 0, used: 0, remaining: 0 },
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={s.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Question Bank Stats</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {stats.map(row => (
            <CategoryCard
              key={row.category}
              row={row}
              onReset={() => handleReset(row.category)}
            />
          ))}

          {/* Overall totals */}
          <View style={s.totalsCard}>
            <Text style={s.sectionLabel}>OVERALL TOTALS</Text>
            <View style={s.totalsRow}>
              <TotalStat label="Total"     value={totals.total}     color={C.text} />
              <TotalStat label="Used"      value={totals.used}      color={C.textSec} />
              <TotalStat label="Remaining" value={totals.remaining} color={C.primary} />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TotalStat({ label, value, color }) {
  return (
    <View style={s.totalStat}>
      <Text style={[s.totalValue, { color }]}>{value}</Text>
      <Text style={s.totalLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  back:   { color: C.primary, fontSize: 17 },
  title:  { color: C.text, fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 16 },

  card: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 16, marginBottom: 12,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catName:    { color: C.text, fontSize: 15, fontWeight: '700', flex: 1 },
  resetBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  resetLabel: { color: C.textSec, fontSize: 12, fontWeight: '600' },

  track: { height: 6, backgroundColor: C.track, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  fill:  { height: '100%', backgroundColor: C.primary, borderRadius: 3 },

  statsRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  statMain:  {},
  statUsed:  { color: C.primary, fontSize: 17, fontWeight: '700' },
  statOf:    { color: C.textSec, fontSize: 14 },
  remaining: { color: C.textSec, fontSize: 13 },
  lastUsed:  { color: C.textSec, fontSize: 12, marginTop: 2 },

  totalsCard: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, padding: 20, marginTop: 8,
  },
  sectionLabel: { color: C.textSec, fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 16 },
  totalsRow:    { flexDirection: 'row', justifyContent: 'space-around' },
  totalStat:    { alignItems: 'center' },
  totalValue:   { fontSize: 32, fontWeight: '700' },
  totalLabel:   { color: C.textSec, fontSize: 13, marginTop: 4 },
});
