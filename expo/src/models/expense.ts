export type ExpenseCategoryName =
  | 'Ăn uống'
  | 'Di chuyển'
  | 'Mua sắm'
  | 'Hóa đơn'
  | 'Sức khỏe'
  | 'Khác';

export type Expense = {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: ExpenseCategoryName;
  note: string;
  receiptUri?: string;
};

export const categories: {
  name: ExpenseCategoryName;
  color: string;
  icon: string;
}[] = [
  { name: 'Ăn uống', color: '#FF886E', icon: 'silverware-fork-knife' },
  { name: 'Di chuyển', color: '#5987F5', icon: 'car' },
  { name: 'Mua sắm', color: '#B37AE8', icon: 'shopping' },
  { name: 'Hóa đơn', color: '#35B69A', icon: 'receipt-text' },
  { name: 'Sức khỏe', color: '#E76F97', icon: 'heart-pulse' },
  { name: 'Khác', color: '#E9B548', icon: 'dots-horizontal' },
];

export const categoryColor = (name: string) =>
  categories.find((category) => category.name === name)?.color ?? '#8791A9';

export const formatVnd = (value: number) =>
  `${Math.round(value).toLocaleString('vi-VN')} ₫`;

export const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
