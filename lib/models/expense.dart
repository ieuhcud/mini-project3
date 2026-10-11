import 'package:flutter/material.dart';

class Expense {
  const Expense({
    required this.id,
    required this.merchant,
    required this.amount,
    required this.date,
    required this.category,
    this.note = '',
    this.receiptPath,
  });

  final String id;
  final String merchant;
  final double amount;
  final DateTime date;
  final String category;
  final String note;
  final String? receiptPath;

  Map<String, Object?> toJson() => {
        'id': id,
        'merchant': merchant,
        'amount': amount,
        'date': date.toIso8601String(),
        'category': category,
        'note': note,
        'receiptPath': receiptPath,
      };

  factory Expense.fromJson(Map<String, Object?> json) => Expense(
        id: json['id'] as String,
        merchant: json['merchant'] as String,
        amount: (json['amount'] as num).toDouble(),
        date: DateTime.parse(json['date'] as String),
        category: json['category'] as String,
        note: json['note'] as String? ?? '',
        receiptPath: json['receiptPath'] as String?,
      );
}

class ExpenseCategory {
  const ExpenseCategory(this.name, this.icon, this.color);

  final String name;
  final IconData icon;
  final Color color;
}

const expenseCategories = <ExpenseCategory>[
  ExpenseCategory('Ăn uống', Icons.restaurant_rounded, Color(0xFFFF8B6A)),
  ExpenseCategory('Di chuyển', Icons.directions_car_rounded, Color(0xFF5686F5)),
  ExpenseCategory('Mua sắm', Icons.shopping_bag_rounded, Color(0xFFB078E5)),
  ExpenseCategory('Hóa đơn', Icons.receipt_long_rounded, Color(0xFF34B59A)),
  ExpenseCategory('Sức khỏe', Icons.favorite_rounded, Color(0xFFE66E94)),
  ExpenseCategory('Khác', Icons.more_horiz_rounded, Color(0xFFF0B84B)),
];

Color categoryColor(String category) => expenseCategories
    .firstWhere(
      (item) => item.name == category,
      orElse: () => expenseCategories.last,
    )
    .color;
