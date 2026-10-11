import Storage from 'expo-sqlite/kv-store';
import type { Expense } from '../models/expense';

const STORAGE_KEY = 'minto.expenses.v1';

function sampleExpenses(): Expense[] {
  const today = new Date();
  const at = (offset: number) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    return date.toISOString();
  };
  return [
    { id: 'seed-1', merchant: 'Cà phê Mộc', amount: 68000, date: at(0), category: 'Ăn uống', note: 'Cà phê và bánh ngọt' },
    { id: 'seed-2', merchant: 'Grab', amount: 42000, date: at(1), category: 'Di chuyển', note: 'Di chuyển trong thành phố' },
    { id: 'seed-3', merchant: 'WinMart', amount: 315000, date: at(2), category: 'Mua sắm', note: '' },
    { id: 'seed-4', merchant: 'Nhà thuốc An Khang', amount: 128000, date: at(3), category: 'Sức khỏe', note: '' },
    { id: 'seed-5', merchant: 'Điện lực', amount: 540000, date: at(6), category: 'Hóa đơn', note: 'Tiền điện' },
  ];
}

export async function loadExpenses(): Promise<Expense[]> {
  const raw = await Storage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Expense[];
    } catch {
      return sampleExpenses();
    }
  }
  const initial = sampleExpenses();
  await saveExpenses(initial);
  return initial;
}

export async function saveExpenses(expenses: Expense[]) {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
