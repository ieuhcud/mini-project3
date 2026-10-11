import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { categories, formatVnd, makeId, type Expense, type ExpenseCategoryName } from '../models/expense';
import { loadExpenses, saveExpenses } from '../services/expenseStore';
import { parseReceipt } from '../services/receiptParser';
import { recognizeReceipt } from '../services/ocr';

function parseEditableDate(value: string): string | null {
  const dmy = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(value.trim());
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year > 69 ? 1900 : 2000;
    const date = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
    if (date.getFullYear() !== year || date.getMonth() !== Number(dmy[2]) - 1 || date.getDate() !== Number(dmy[1])) return null;
    return date.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const todayDisplay = () => new Date().toLocaleDateString('vi-VN');

export default function ReceiptEntryScreen() {
  const router = useRouter();
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayDisplay());
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryName>('Ăn uống');
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [rawText, setRawText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    loadExpenses().then((items) => {
      const expense = items.find((item) => item.id === id);
      if (!active || !expense) return;
      setMerchant(expense.merchant);
      setAmount(String(expense.amount));
      setDate(new Date(expense.date).toLocaleDateString('vi-VN'));
      setNote(expense.note);
      setCategory(expense.category);
      setReceiptUri(expense.receiptUri);
    });
    return () => { active = false; };
  }, [id]);

  const screenTitle = useMemo(() => id ? 'Sửa giao dịch' : source === 'receipt' ? 'Quét hóa đơn' : 'Thêm giao dịch', [id, source]);

  const scan = async (uri: string) => {
    setReceiptUri(uri);
    setBusy(true);
    setNotice('Đang nhận dạng chữ trên thiết bị…');
    try {
      const text = await recognizeReceipt(uri);
      const draft = parseReceipt(text);
      setRawText(text);
      if (draft.merchant !== 'Chưa nhận diện') setMerchant(draft.merchant);
      if (draft.amount > 0) setAmount(String(Math.round(draft.amount)));
      setDate(new Date(draft.date).toLocaleDateString('vi-VN'));
      setNotice(`Đã đọc hóa đơn · độ tin cậy gợi ý ${Math.round(draft.confidence * 100)}% — hãy kiểm tra lại.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đọc ảnh hóa đơn.';
      setNotice(message.includes('native module') || message.includes('Expo Go')
        ? 'OCR cần development build có ML Kit. Ảnh vẫn được giữ để bạn nhập thông tin thủ công.'
        : message);
    } finally {
      setBusy(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true });
    if (!result.canceled && result.assets[0]) await scan(result.assets[0].uri);
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền camera', 'Hãy cho phép Minto dùng camera để chụp hóa đơn.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true });
    if (!result.canceled && result.assets[0]) await scan(result.assets[0].uri);
  };

  const save = async () => {
    const parsedAmount = Number(amount.replace(/[.\s,₫đ]/gi, ''));
    const parsedDate = parseEditableDate(date);
    if (!merchant.trim()) {
      Alert.alert('Thiếu cửa hàng', 'Nhập tên cửa hàng hoặc người nhận tiền.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Số tiền chưa hợp lệ', 'Nhập số tiền lớn hơn 0.');
      return;
    }
    if (!parsedDate) {
      Alert.alert('Ngày chưa hợp lệ', 'Nhập ngày theo định dạng ngày/tháng/năm.');
      return;
    }
    const items = await loadExpenses();
    const expense: Expense = {
      id: id ?? makeId(),
      merchant: merchant.trim(),
      amount: parsedAmount,
      date: parsedDate,
      category,
      note: note.trim(),
      receiptUri,
    };
    const next = id ? items.map((item) => item.id === id ? expense : item) : [expense, ...items];
    await saveExpenses(next);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.navbar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={21} color="#343B59" /></Pressable>
          <Text style={styles.navTitle}>{screenTitle}</Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <Text style={styles.heading}>{source === 'receipt' && !id ? 'Đưa hóa đơn vào đây' : 'Thông tin giao dịch'}</Text>
          <Text style={styles.intro}>Ảnh được đọc ngay trên thiết bị. Bạn có thể sửa mọi trường trước khi lưu.</Text>

          <View style={styles.uploadRow}>
            <Pressable style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]} onPress={takePhoto}>
              <View style={styles.uploadIcon}><Ionicons name="camera-outline" size={21} color="#5E6CEB" /></View>
              <Text style={styles.uploadTitle}>Chụp hóa đơn</Text>
              <Text style={styles.uploadCaption}>Dùng camera</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]} onPress={pickImage}>
              <View style={styles.uploadIcon}><Ionicons name="images-outline" size={21} color="#5E6CEB" /></View>
              <Text style={styles.uploadTitle}>Chọn ảnh</Text>
              <Text style={styles.uploadCaption}>Từ thư viện</Text>
            </Pressable>
          </View>

          {receiptUri ? <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" /> : null}
          {busy ? <View style={styles.notice}><ActivityIndicator color="#5D6BF0" /><Text style={styles.noticeText}>{notice}</Text></View> : notice ? <View style={styles.notice}><MaterialCommunityIcons name="information-outline" size={17} color="#5D6BF0" /><Text style={styles.noticeText}>{notice}</Text></View> : null}

          <Text style={styles.label}>Cửa hàng / người nhận</Text>
          <TextInput value={merchant} onChangeText={setMerchant} placeholder="Ví dụ: Cà phê Mộc" style={styles.input} placeholderTextColor="#A5ABBA" returnKeyType="next" />

          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Text style={styles.label}>Số tiền</Text>
              <TextInput value={amount} onChangeText={(value) => setAmount(value.replace(/[^\d]/g, ''))} placeholder="0" style={styles.input} placeholderTextColor="#A5ABBA" keyboardType="number-pad" />
              <Text style={styles.inputHint}>{amount ? formatVnd(Number(amount)) : 'Đơn vị: VND'}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Ngày giao dịch</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="dd/mm/yyyy" style={styles.input} placeholderTextColor="#A5ABBA" />
              <Text style={styles.inputHint}>Ngày/tháng/năm</Text>
            </View>
          </View>

          <Text style={styles.label}>Danh mục</Text>
          <View style={styles.categories}>
            {categories.map((item) => {
              const active = item.name === category;
              return (
                <Pressable key={item.name} onPress={() => setCategory(item.name)} style={[styles.categoryChip, active && { backgroundColor: `${item.color}16`, borderColor: `${item.color}70` }]}>
                  <MaterialCommunityIcons name={item.icon as never} size={15} color={item.color} />
                  <Text style={[styles.categoryText, active && { color: item.color }]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Ghi chú <Text style={styles.optional}>(không bắt buộc)</Text></Text>
          <TextInput value={note} onChangeText={setNote} placeholder="Thêm ghi chú cho khoản chi" style={[styles.input, styles.noteInput]} placeholderTextColor="#A5ABBA" multiline />

          <Text style={styles.label}>Văn bản nhận dạng</Text>
          <TextInput value={rawText} onChangeText={setRawText} placeholder="Nội dung OCR sẽ xuất hiện ở đây để bạn đối chiếu…" style={[styles.input, styles.ocrInput]} placeholderTextColor="#A5ABBA" multiline textAlignVertical="top" />

          <Pressable onPress={save} disabled={busy} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, busy && styles.disabled]}>
            <Text style={styles.saveText}>{id ? 'Lưu thay đổi' : 'Lưu giao dịch'}</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.footnote}>Thông tin OCR chỉ là gợi ý. Hãy xác nhận số tiền và ngày trước khi lưu.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  flex: { flex: 1 },
  navbar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EAF1', backgroundColor: '#FFFFFF' },
  backButton: { height: 36, width: 36, borderRadius: 12, backgroundColor: '#F3F4FA', justifyContent: 'center', alignItems: 'center' },
  navTitle: { color: '#29304C', fontSize: 14, fontWeight: '800' },
  navSpacer: { width: 36 },
  page: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  heading: { color: '#252D4B', fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
  intro: { marginTop: 6, marginBottom: 17, color: '#858DA1', fontSize: 11, lineHeight: 17 },
  uploadRow: { flexDirection: 'row', gap: 11, marginBottom: 14 },
  uploadButton: { flex: 1, minHeight: 108, padding: 13, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EBF3' },
  uploadIcon: { height: 35, width: 35, borderRadius: 12, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  uploadTitle: { fontSize: 11, fontWeight: '800', color: '#303751' },
  uploadCaption: { fontSize: 10, color: '#9AA1B2', marginTop: 3 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  receiptImage: { width: '100%', height: 178, borderRadius: 16, marginBottom: 12, backgroundColor: '#EDEFF5' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF0FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 13 },
  noticeText: { flex: 1, color: '#59658A', fontSize: 10, lineHeight: 15 },
  label: { marginTop: 13, marginBottom: 7, fontSize: 11, color: '#4A526B', fontWeight: '800' },
  optional: { color: '#9299AB', fontWeight: '400' },
  input: { minHeight: 46, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: '#E5E8F0', borderRadius: 13, color: '#303751', backgroundColor: '#FFFFFF', fontSize: 12 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  inputHint: { marginTop: 5, marginLeft: 2, fontSize: 9, color: '#939AAC' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#EBEDF3', backgroundColor: '#FFFFFF' },
  categoryText: { color: '#737B90', fontSize: 10, fontWeight: '700' },
  noteInput: { minHeight: 73, textAlignVertical: 'top' },
  ocrInput: { minHeight: 105, lineHeight: 17, textAlignVertical: 'top' },
  saveButton: { marginTop: 21, height: 51, borderRadius: 16, backgroundColor: '#5869EE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: '#5869EE', shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  saveText: { fontSize: 12, color: '#FFFFFF', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  footnote: { textAlign: 'center', marginTop: 11, color: '#A0A6B5', fontSize: 9, lineHeight: 14 },
});
