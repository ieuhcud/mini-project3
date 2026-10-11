export type ReceiptDraft = {
  merchant: string;
  amount: number;
  date: string;
  rawText: string;
  confidence: number;
};

const datePattern = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b|\b(20\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\b/;
const moneyPattern = /(?:₫|đ|vnd)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:₫|đ|vnd)?/gi;
const totalWords = /tong\s*(?:thanh\s*toan|cong|tien)?|thanh\s*toan|phai\s*tra|can\s*tra|total\s*due|grand\s*total|amount\s*due|net\s*total|total/i;

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

function parseDate(text: string): string | null {
  const match = datePattern.exec(text);
  datePattern.lastIndex = 0;
  if (!match) return null;
  const yearRaw = match[3] ?? match[4];
  let year = Number(yearRaw);
  const month = Number(match[3] ? match[2] : match[5]);
  const day = Number(match[3] ? match[1] : match[6]);
  if (yearRaw.length === 2) year += year >= 70 ? 1900 : 2000;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.toISOString();
}

function findMerchant(lines: string[]): string {
  const ignored = /(hoa don|invoice|receipt|ngay|date|cashier|nhan vien|ma so thue|mst|tel|phone|www\.|http|\d{2,})/i;
  for (const line of lines.slice(0, 8)) {
    const letters = (line.match(/[A-Za-zÀ-ỹ]/g) ?? []).length;
    if (letters < 3 || line.length > 60 || ignored.test(fold(line))) continue;
    return line.replace(/^[*#\-\s]+|[*#\-\s]+$/g, '');
  }
  return 'Chưa nhận diện';
}

export function parseReceipt(rawText: string, now = new Date()): ReceiptDraft {
  const lines = rawText
    .split(/[\r\n]+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const date = parseDate(rawText) ?? now.toISOString();
  const candidates: { amount: number; score: number }[] = [];

  for (const line of lines) {
    const normalized = fold(line);
    const scoreBase = (totalWords.test(normalized) ? 100 : 0)
      - (normalized.includes('subtotal') ? 25 : 0)
      - (normalized.includes('tax') || normalized.includes('thue') ? 20 : 0)
      - (normalized.includes('discount') || normalized.includes('giam gia') ? 35 : 0);
    const amountText = line.replace(datePattern, ' ');
    moneyPattern.lastIndex = 0;
    for (const match of amountText.matchAll(moneyPattern)) {
      const digits = (match[1] ?? '').replace(/\D/g, '');
      const amount = Number(digits || 0) + (match[2] ? Number(match[2]) / (match[2].length === 1 ? 10 : 100) : 0);
      if (amount > 0 && amount <= 100_000_000_000) candidates.push({ amount, score: scoreBase });
    }
  }
  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  const amount = candidates[0]?.amount ?? 0;
  const merchant = findMerchant(lines);
  const confidence = (merchant !== 'Chưa nhận diện' ? 0.35 : 0)
    + (amount > 0 ? 0.45 : 0)
    + (parseDate(rawText) ? 0.2 : 0);

  return { merchant, amount, date, rawText, confidence };
}
