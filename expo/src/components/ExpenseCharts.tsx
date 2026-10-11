import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { formatVnd } from '../models/expense';

export type ChartItem = { name: string; value: number; color: string };

function donutPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const point = (radius: number, angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });
  const a = point(outer, start);
  const b = point(outer, end);
  const c = point(inner, end);
  const d = point(inner, start);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;
}

export function ExpensePieChart({ items }: { items: ChartItem[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [entrance] = useState(() => new Animated.Value(0.92));
  const [opacity] = useState(() => new Animated.Value(0));
  const activeItems = useMemo(() => items.filter((item) => item.value > 0), [items]);
  const total = activeItems.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entrance, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 150 }),
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [entrance, opacity]);

  if (!activeItems.length) return <Text style={styles.empty}>Chưa có dữ liệu chi tiêu</Text>;

  const paths = activeItems.map((item, index) => {
    const start = -Math.PI / 2 + activeItems
      .slice(0, index)
      .reduce((sum, entry) => sum + (entry.value / total) * Math.PI * 2, 0);
    const end = start + (item.value / total) * Math.PI * 2;
    return { ...item, index, path: donutPath(120, 120, 92, 61, start + 0.014, end - 0.014) };
  });
  const selectedItem = selected === null ? null : activeItems[selected];

  return (
    <View style={styles.chartWrap}>
      <Animated.View style={{ opacity, transform: [{ scale: entrance }] }}>
        <Svg width={240} height={240} viewBox="0 0 240 240">
          {paths.map((item) => (
            <Path
              key={item.name}
              d={item.path}
              fill={item.color}
              opacity={selected === null || selected === item.index ? 1 : 0.48}
              onPress={() => setSelected(selected === item.index ? null : item.index)}
            />
          ))}
          <Circle cx={120} cy={120} r={58} fill="#FFFFFF" />
          <SvgText x={120} y={113} textAnchor="middle" fill="#858CA0" fontSize={10}>
            {selectedItem?.name ?? 'TỔNG CHI'}
          </SvgText>
          <SvgText x={120} y={134} textAnchor="middle" fill="#202744" fontSize={13} fontWeight="700">
            {formatVnd(selectedItem?.value ?? total)}
          </SvgText>
        </Svg>
      </Animated.View>
      <View style={styles.legend}>
        {activeItems.slice(0, 6).map((item, index) => (
          <Pressable key={item.name} style={styles.legendItem} onPress={() => setSelected(selected === index ? null : index)}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.name} {Math.round((item.value / total) * 100)}%</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.chartHint}>Chạm vào danh mục để xem chi tiết</Text>
    </View>
  );
}

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function WeeklyBarChart({ values }: { values: number[] }) {
  const [selected, setSelected] = useState(values.length - 1);
  const [progress] = useState(() => values.map(() => new Animated.Value(0)));
  const max = Math.max(1, ...values);
  const selectedValue = values[Math.min(Math.max(selected, 0), values.length - 1)] ?? 0;
  const today = new Date();

  useEffect(() => {
    const animations = progress.slice(0, values.length).map((value) =>
      Animated.timing(value, { toValue: 1, duration: 520, useNativeDriver: false }),
    );
    Animated.stagger(45, animations).start();
  }, [progress, values.length]);

  return (
    <View style={styles.weeklyWrap}>
      <View style={styles.weeklyTop}>
        <Text style={styles.weeklyAmount}>{formatVnd(selectedValue)}</Text>
        <Text style={styles.weeklyCaption}>
          {selected === values.length - 1 ? 'Hôm nay' : dayNames[new Date(today.getFullYear(), today.getMonth(), today.getDate() - (values.length - 1 - selected)).getDay()]}
        </Text>
      </View>
      <View style={styles.bars}>
        {values.map((value, index) => {
          const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (values.length - 1 - index));
          const height = progress[index]?.interpolate({ inputRange: [0, 1], outputRange: [4, Math.max(4, (value / max) * 126)] }) ?? 4;
          return (
            <Pressable key={index} style={styles.barSlot} onPress={() => setSelected(index)}>
              <View style={styles.barArea}>
                <Animated.View style={[styles.bar, { height, backgroundColor: selected === index ? '#5D6CF4' : '#DFE3FF' }]} />
              </View>
              <Text style={[styles.dayLabel, selected === index && styles.activeDay]}>
                {index === values.length - 1 ? 'Hôm nay' : dayNames[date.getDay()]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.chartHint}>Chạm vào cột để xem tổng chi trong ngày</Text>
    </View>
  );
}

export function MiniBars({ items }: { items: ChartItem[] }) {
  const top = Math.max(1, ...items.map((item) => item.value));
  return (
    <View style={styles.miniBars}>
      {items.slice(0, 4).map((item) => (
        <View key={item.name} style={styles.miniBarItem}>
          <View style={styles.miniBarTrack}>
            <View style={[styles.miniBarFill, { width: `${Math.max(8, (item.value / top) * 100)}%`, backgroundColor: item.color }]} />
          </View>
          <Text numberOfLines={1} style={styles.miniBarLabel}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { alignItems: 'center' },
  empty: { paddingVertical: 50, textAlign: 'center', color: '#9299AA' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: '#68718A', fontSize: 11, fontWeight: '600' },
  chartHint: { marginTop: 12, fontSize: 10, color: '#9AA1B2' },
  weeklyWrap: { width: '100%' },
  weeklyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 4, marginBottom: 12 },
  weeklyAmount: { color: '#222A47', fontSize: 16, fontWeight: '800' },
  weeklyCaption: { color: '#7F879B', fontSize: 11, fontWeight: '700' },
  bars: { flexDirection: 'row', height: 164, alignItems: 'flex-end', justifyContent: 'space-around', gap: 4 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barArea: { height: 132, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '48%', borderRadius: 8, minHeight: 4 },
  dayLabel: { color: '#989FB0', fontSize: 9, marginTop: 8, fontWeight: '600' },
  activeDay: { color: '#5666E8' },
  miniBars: { gap: 12 },
  miniBarItem: { gap: 5 },
  miniBarTrack: { height: 7, borderRadius: 5, backgroundColor: '#F1F3FA', overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 5 },
  miniBarLabel: { color: '#7A8297', fontSize: 10 },
});



