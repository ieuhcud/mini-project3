import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/expense.dart';

class ExpenseStore {
  static const _storageKey = 'mini_project3_expenses_v1';

  Future<List<Expense>> load() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null || raw.isEmpty) return _sampleExpenses();
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) => Expense.fromJson(Map<String, Object?>.from(item as Map)))
          .toList();
    } on FormatException {
      return _sampleExpenses();
    } on TypeError {
      return _sampleExpenses();
    }
  }

  Future<void> save(List<Expense> expenses) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _storageKey,
      jsonEncode(expenses.map((expense) => expense.toJson()).toList()),
    );
  }

  List<Expense> _sampleExpenses() {
    final now = DateTime.now();
    return [
      Expense(id: 'seed-1', merchant: 'Cà phê Mộc', amount: 68000, date: DateTime(now.year, now.month, now.day), category: 'Ăn uống', note: 'Cà phê và bánh ngọt'),
      Expense(id: 'seed-2', merchant: 'Grab', amount: 42000, date: DateTime(now.year, now.month, now.day - 1), category: 'Di chuyển', note: 'Di chuyển trong thành phố'),
      Expense(id: 'seed-3', merchant: 'WinMart', amount: 315000, date: DateTime(now.year, now.month, now.day - 2), category: 'Mua sắm'),
      Expense(id: 'seed-4', merchant: 'Nhà thuốc An Khang', amount: 128000, date: DateTime(now.year, now.month, now.day - 3), category: 'Sức khỏe'),
      Expense(id: 'seed-5', merchant: 'Điện lực', amount: 540000, date: DateTime(now.year, now.month, now.day - 6), category: 'Hóa đơn', note: 'Tiền điện'),
    ];
  }
}
