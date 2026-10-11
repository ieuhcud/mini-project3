import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/expense.dart';
import '../services/expense_store.dart';
import '../widgets/expense_charts.dart';
import 'receipt_entry_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _store = ExpenseStore();
  List<Expense> _expenses = [];
  bool _loading = true;
  late DateTime _month;
  static const _budget = 12000000.0;

  @override
  void initState() {
    super.initState();
    _month = DateTime(DateTime.now().year, DateTime.now().month);
    _load();
  }

  Future<void> _load() async {
    final expenses = await _store.load();
    if (!mounted) return;
    setState(() {
      _expenses = expenses;
      _loading = false;
    });
  }

  List<Expense> get _monthExpenses => _expenses
      .where((expense) => expense.date.year == _month.year && expense.date.month == _month.month)
      .toList();

  double get _monthTotal => _monthExpenses.fold<double>(0, (sum, expense) => sum + expense.amount);

  Map<String, double> get _categoryTotals {
    final totals = <String, double>{};
    for (final expense in _monthExpenses) {
      totals.update(expense.category, (value) => value + expense.amount, ifAbsent: () => expense.amount);
    }
    return totals;
  }

  List<double> get _weeklyTotals {
    final today = DateTime.now();
    return List.generate(7, (index) {
      final date = DateTime(today.year, today.month, today.day - 6 + index);
      return _expenses
          .where((expense) => expense.date.year == date.year && expense.date.month == date.month && expense.date.day == date.day)
          .fold<double>(0, (sum, expense) => sum + expense.amount);
    });
  }

  Future<void> _openEntry({String? source}) async {
    final expense = await Navigator.of(context).push<Expense>(
      MaterialPageRoute(builder: (_) => ReceiptEntryScreen(initialSource: source)),
    );
    if (expense == null || !mounted) return;
    final updated = [expense, ..._expenses]..sort((a, b) => b.date.compareTo(a.date));
    setState(() => _expenses = updated);
    await _store.save(updated);
  }

  Future<void> _deleteExpense(Expense expense) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa giao dịch?'),
        content: Text('Bạn muốn xóa khoản chi tại ${expense.merchant}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Giữ lại')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xóa')),
        ],
      ),
    );
    if (shouldDelete != true) return;
    final updated = _expenses.where((item) => item.id != expense.id).toList();
    setState(() => _expenses = updated);
    await _store.save(updated);
  }

  @override
  Widget build(BuildContext context) {
    final recent = [..._monthExpenses]..sort((a, b) => b.date.compareTo(a.date));
    final progress = (_monthTotal / _budget).clamp(0.0, 1.0).toDouble();
    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : CustomScrollView(
                physics: const BouncingScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                    sliver: SliverList.list(children: [
                      _topBar(context),
                      const SizedBox(height: 22),
                      _budgetCard(progress),
                      const SizedBox(height: 26),
                      _sectionHeading('Phân bổ chi tiêu', 'Theo danh mục'),
                      const SizedBox(height: 12),
                      _chartCard(child: ExpensePieChart(values: _categoryTotals)),
                      const SizedBox(height: 24),
                      _sectionHeading('Nhịp chi tiêu', '7 ngày gần nhất'),
                      const SizedBox(height: 12),
                      _chartCard(child: WeeklyBarChart(values: _weeklyTotals)),
                      const SizedBox(height: 24),
                      _sectionHeading('Giao dịch gần đây', '${recent.length} khoản trong tháng'),
                      const SizedBox(height: 12),
                      if (recent.isEmpty)
                        _emptyTransactions()
                      else
                        ...recent.take(8).map((expense) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _transactionTile(expense),
                            )),
                      const SizedBox(height: 14),
                      _privacyNote(),
                    ]),
                  ),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openEntry(),
        icon: const Icon(Icons.document_scanner_outlined),
        label: const Text('Thêm hóa đơn'),
      ),
    );
  }

  Widget _topBar(BuildContext context) => Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(color: const Color(0xFF5C6CF5), borderRadius: BorderRadius.circular(15)),
            child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('minto', style: TextStyle(fontSize: 24, height: 1, fontWeight: FontWeight.w900, letterSpacing: -.8, color: Color(0xFF242B48))),
              const SizedBox(height: 4),
              Text('Chi tiêu nhẹ đầu hơn', style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 12)),
            ]),
          ),
          IconButton.filledTonal(
            tooltip: 'Chụp hóa đơn',
            onPressed: () => _openEntry(source: 'camera'),
            icon: const Icon(Icons.camera_alt_outlined),
          ),
        ],
      );

  Widget _budgetCard(double progress) {
    final monthLabel = DateFormat('MM/yyyy').format(_month);
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(colors: [Color(0xFF5368ED), Color(0xFF7885FF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        boxShadow: [BoxShadow(color: const Color(0xFF5C6CF5).withValues(alpha: .23), blurRadius: 26, offset: const Offset(0, 13))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: Text('Tổng chi tháng này', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600))),
          _monthControl(monthLabel),
        ]),
        const SizedBox(height: 8),
        Text(_money(_monthTotal), style: const TextStyle(color: Colors.white, fontSize: 33, fontWeight: FontWeight.w900, letterSpacing: -.7)),
        const SizedBox(height: 20),
        Row(children: [
          const Expanded(child: Text('Ngân sách tháng', style: TextStyle(color: Colors.white70, fontSize: 12))),
          Text(_money(_budget), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: LinearProgressIndicator(value: progress, minHeight: 8, backgroundColor: Colors.white24, color: progress >= 1 ? const Color(0xFFFFB26B) : Colors.white),
        ),
        const SizedBox(height: 9),
        Text(_monthTotal > _budget ? 'Bạn đã vượt ngân sách tháng' : 'Còn ${_money(_budget - _monthTotal)} trong ngân sách', style: const TextStyle(color: Colors.white70, fontSize: 11)),
      ]),
    );
  }

  Widget _monthControl(String label) => Container(
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: .16), borderRadius: BorderRadius.circular(30)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          _monthArrow(Icons.chevron_left, () => setState(() => _month = DateTime(_month.year, _month.month - 1))),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
          _monthArrow(Icons.chevron_right, () {
            final next = DateTime(_month.year, _month.month + 1);
            if (!next.isAfter(DateTime.now())) setState(() => _month = next);
          }),
        ]),
      );

  Widget _monthArrow(IconData icon, VoidCallback onPressed) => SizedBox(
        width: 30,
        height: 30,
        child: IconButton(padding: EdgeInsets.zero, onPressed: onPressed, icon: Icon(icon, color: Colors.white, size: 18)),
      );

  Widget _sectionHeading(String title, String subtitle) => Row(children: [
        Expanded(child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF252C49)))),
        Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.blueGrey.shade400)),
      ]);

  Widget _chartCard({required Widget child}) => Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(14, 16, 14, 18),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), boxShadow: const [BoxShadow(color: Color(0x080F1C48), blurRadius: 18, offset: Offset(0, 7))]),
        child: child,
      );

  Widget _transactionTile(Expense expense) {
    final category = expenseCategories.firstWhere((item) => item.name == expense.category, orElse: () => expenseCategories.last);
    return GestureDetector(
      onLongPress: () => _deleteExpense(expense),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
        child: Row(children: [
          Container(width: 43, height: 43, decoration: BoxDecoration(color: category.color.withValues(alpha: .12), borderRadius: BorderRadius.circular(14)), child: Icon(category.icon, color: category.color, size: 21)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(expense.merchant, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2A304B))),
            const SizedBox(height: 4),
            Text('${expense.category}  •  ${DateFormat('dd/MM').format(expense.date)}', style: TextStyle(fontSize: 11, color: Colors.blueGrey.shade400)),
          ])),
          const SizedBox(width: 8),
          Text('-${_money(expense.amount)}', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF2D3554), fontSize: 13)),
        ]),
      ),
    );
  }

  Widget _emptyTransactions() => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
        child: const Column(children: [Icon(Icons.receipt_long_outlined, color: Color(0xFFA6AEC0), size: 32), SizedBox(height: 8), Text('Chưa có khoản chi trong tháng này', style: TextStyle(color: Color(0xFF7C8498))) ]),
      );

  Widget _privacyNote() => Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.lock_outline_rounded, size: 13, color: Colors.blueGrey.shade300),
        const SizedBox(width: 6),
        Text('Hóa đơn được xử lý ngay trên thiết bị', style: TextStyle(fontSize: 11, color: Colors.blueGrey.shade400)),
      ]);
}

String _money(double value) => '${value.round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.')} ₫';

