import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ExpensePieChart, WeeklyBarChart, type ChartItem } from '../components/ExpenseCharts';
import { categories, categoryColor, formatDate, formatVnd, type Expense } from '../models/expense';
import { loadExpenses, saveExpenses } from '../services/expenseStore';

const BUDGET = 5_000_000;
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export default function HomeScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [ready, setReady] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadExpenses().then((items) => {
      if (active) {
        setExpenses(items.sort((a, b) => b.date.localeCompare(a.date)));
        setReady(true);
      }
    }).catch(() => setReady(true));
    return () => { active = false; };
  }, []));

  const monthExpenses = useMemo(() => expenses.filter((item) => {
    const date = new Date(item.date);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }), [expenses, month]);
  const monthTotal = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const dailyTotals = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return expenses.filter((item) => {
      const transactionDate = new Date(item.date);
      return transactionDate.getFullYear() === date.getFullYear()
        && transactionDate.getMonth() === date.getMonth()
        && transactionDate.getDate() === date.getDate();
    }).reduce((sum, item) => sum + item.amount, 0);
  }), [expenses]);
  const categoryItems: ChartItem[] = categories.map((category) => ({
    name: category.name,
    value: monthExpenses.filter((item) => item.category === category.name).reduce((sum, item) => sum + item.amount, 0),
    color: category.color,
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const progress = Math.min(1, monthTotal / BUDGET);
  const monthName = month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const changeMonth = (amount: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const removeExpense = (expense: Expense) => Alert.alert(
    'Xóa giao dịch?',
    `Bạn muốn xóa khoản chi tại ${expense.merchant}?`,
    [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => {
        const next = expenses.filter((item) => item.id !== expense.id);
        setExpenses(next);
        void saveExpenses(next);
      } },
    ],
  );

  const add = () => router.push('/receipt');
  const openReceipt = () => router.push({ pathname: '/receipt', params: { source: 'receipt' } });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><MaterialCommunityIcons name="leaf" size={21} color="#FFFFFF" /></View>
            <View>
              <Text style={styles.brand}>minto</Text>
              <Text style={styles.brandCaption}>CHI TIÊU CÓ Ý THỨC</Text>
            </View>
          </View>
          <Pressable style={styles.avatar} onPress={() => router.push('/receipt')}>
            <Ionicons name="person-outline" size={18} color="#5966C9" />
          </Pressable>
        </View>

        <Text style={styles.greeting}>Chào bạn 👋</Text>
        <Text style={styles.subGreeting}>Cùng xem dòng tiền của bạn hôm nay nhé.</Text>

        <LinearGradient colors={['#5368ED', '#7885FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>TỔNG CHI · {monthName.toLocaleUpperCase('vi-VN')}</Text>
            <View style={styles.monthButtons}>
              <Pressable accessibilityLabel="Tháng trước" onPress={() => changeMonth(-1)} style={styles.monthButton}><Ionicons name="chevron-back" size={16} color="#FFFFFF" /></Pressable>
              <Pressable accessibilityLabel="Tháng sau" onPress={() => changeMonth(1)} style={styles.monthButton}><Ionicons name="chevron-forward" size={16} color="#FFFFFF" /></Pressable>
            </View>
          </View>
          <Text style={styles.total}>{formatVnd(monthTotal)}</Text>
          <View style={styles.budgetLine}><Text style={styles.budgetSmall}>Ngân sách tháng</Text><Text style={styles.budgetSmallStrong}>{formatVnd(BUDGET)}</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: monthTotal > BUDGET ? '#FFB26B' : '#FFFFFF' }]} /></View>
          <Text style={styles.remaining}>{monthTotal > BUDGET ? 'Bạn đã vượt ngân sách tháng' : `Còn ${formatVnd(BUDGET - monthTotal)} trong ngân sách`}</Text>
          <View pointerEvents="none" style={styles.budgetGlow} />
        </LinearGradient>

        <View style={styles.quickActions}>
          <Pressable onPress={openReceipt} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}>
            <View style={styles.scanIcon}><MaterialCommunityIcons name="line-scan" size={21} color="#5968EC" /></View>
            <View style={styles.quickText}><Text style={styles.quickTitle}>Quét hóa đơn</Text><Text style={styles.quickCaption}>ML Kit · ngoại tuyến</Text></View>
            <Ionicons name="arrow-forward" size={17} color="#737B94" />
          </Pressable>
          <Pressable accessibilityLabel="Thêm giao dịch thủ công" onPress={add} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Ionicons name="add" size={25} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text><Text style={styles.sectionSub}>Tháng {month.getMonth() + 1} · {categoryItems.length} danh mục</Text></View>
          <View style={styles.sectionIcon}><MaterialCommunityIcons name="chart-donut-variant" size={18} color="#5868EC" /></View>
        </View>
        <View style={styles.card}><ExpensePieChart items={categoryItems} /></View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Nhịp chi tiêu</Text><Text style={styles.sectionSub}>Tổng quan 7 ngày gần nhất</Text></View>
          <View style={styles.sectionIcon}><MaterialCommunityIcons name="chart-bar" size={18} color="#5868EC" /></View>
        </View>
        <View style={styles.card}><WeeklyBarChart values={dailyTotals} /></View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Giao dịch gần đây</Text><Text style={styles.sectionSub}>{monthExpenses.length} khoản chi trong tháng này</Text></View>
          <Pressable onPress={add}><Text style={styles.seeAll}>＋ Thêm</Text></Pressable>
        </View>
        <View style={styles.transactions}>
          {!ready ? <Text style={styles.emptyState}>Đang tải giao dịch…</Text> : monthExpenses.length === 0 ? (
            <Text style={styles.emptyState}>Chưa có giao dịch trong tháng này.</Text>
          ) : monthExpenses.slice(0, 8).map((expense) => (
            <Pressable key={expense.id} onLongPress={() => removeExpense(expense)} style={styles.transaction}>
              <View style={[styles.transactionIcon, { backgroundColor: `${categoryColor(expense.category)}20` }]}>
                <MaterialCommunityIcons name={(categories.find((category) => category.name === expense.category)?.icon ?? 'dots-horizontal') as never} size={19} color={categoryColor(expense.category)} />
              </View>
              <View style={styles.transactionInfo}>
                <Text numberOfLines={1} style={styles.merchant}>{expense.merchant}</Text>
                <Text style={styles.transactionMeta}>{expense.category} · {formatDate(expense.date)}</Text>
              </View>
              <Text style={styles.transactionAmount}>−{formatVnd(expense.amount)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.footer}>Dữ liệu được lưu trên thiết bị của bạn.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  page: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 34 },
  topbar: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { height: 39, width: 39, borderRadius: 14, backgroundColor: '#5C6CF1', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 19, fontWeight: '900', letterSpacing: -0.6, color: '#222A48' },
  brandCaption: { fontSize: 8, letterSpacing: 1.1, color: '#939AAF', fontWeight: '700', marginTop: 1 },
  avatar: { height: 38, width: 38, borderRadius: 19, backgroundColor: '#ECEEFF', alignItems: 'center', justifyContent: 'center' },
  greeting: { marginTop: 7, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: '#232A47' },
  subGreeting: { marginTop: 4, marginBottom: 20, fontSize: 12, color: '#858DA1' },
  budgetCard: { borderRadius: 25, padding: 21, overflow: 'hidden', shadowColor: '#5968E8', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetLabel: { color: '#E3E7FF', fontSize: 10, letterSpacing: 0.8, fontWeight: '800' },
  monthButtons: { flexDirection: 'row', gap: 2 },
  monthButton: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF20', alignItems: 'center', justifyContent: 'center' },
  total: { marginTop: 9, color: '#FFFFFF', fontSize: 31, fontWeight: '900', letterSpacing: -0.8 },
  budgetLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  budgetSmall: { fontSize: 11, color: '#E6E9FF' },
  budgetSmallStrong: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },
  progressTrack: { marginTop: 8, height: 7, borderRadius: 5, backgroundColor: '#FFFFFF45', overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 5 },
  remaining: { marginTop: 9, color: '#E7E9FF', fontSize: 10 },
  budgetGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 90, backgroundColor: '#FFFFFF10', right: -75, top: -82 },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 25 },
  scanButton: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 11, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F7' },
  scanIcon: { width: 39, height: 39, backgroundColor: '#EFF0FF', borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  quickText: { flex: 1 },
  quickTitle: { color: '#303752', fontSize: 12, fontWeight: '800' },
  quickCaption: { color: '#939AAF', fontSize: 10, marginTop: 4 },
  addButton: { width: 62, borderRadius: 18, backgroundColor: '#5B6BF0', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, color: '#272F4C' },
  sectionSub: { fontSize: 10, color: '#9299AB', marginTop: 4 },
  sectionIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#ECEEFF', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#F0F1F6' },
  seeAll: { color: '#5868EB', fontSize: 11, fontWeight: '800' },
  transactions: { backgroundColor: '#FFFFFF', borderRadius: 21, paddingHorizontal: 12, borderWidth: 1, borderColor: '#F0F1F6' },
  transaction: { minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ECEEF4', gap: 11 },
  transactionIcon: { height: 41, width: 41, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  merchant: { fontSize: 12, color: '#2C334D', fontWeight: '800' },
  transactionMeta: { fontSize: 10, color: '#9299AB', marginTop: 5 },
  transactionAmount: { fontSize: 11, color: '#303752', fontWeight: '800' },
  emptyState: { textAlign: 'center', paddingVertical: 24, color: '#969DAE', fontSize: 12 },
  footer: { textAlign: 'center', marginTop: 22, color: '#A1A7B5', fontSize: 10 },
});
