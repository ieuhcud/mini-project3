import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../models/expense.dart';

class ExpensePieChart extends StatefulWidget {
  const ExpensePieChart({super.key, required this.values});

  final Map<String, double> values;

  @override
  State<ExpensePieChart> createState() => _ExpensePieChartState();
}

class _ExpensePieChartState extends State<ExpensePieChart>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  int? _selected;

  List<MapEntry<String, double>> get _entries => widget.values.entries
      .where((entry) => entry.value > 0)
      .toList()
    ..sort((a, b) => b.value.compareTo(a.value));

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 850))
      ..forward();
  }

  @override
  void didUpdateWidget(covariant ExpensePieChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.values != widget.values) _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _selectAt(Offset localPosition, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final delta = localPosition - center;
    if (delta.distance < size.shortestSide * .19) return;
    var angle = math.atan2(delta.dy, delta.dx) + math.pi / 2;
    if (angle < 0) angle += 2 * math.pi;
    final entries = _entries;
    final total = entries.fold<double>(0, (sum, entry) => sum + entry.value);
    var cursor = 0.0;
    for (var i = 0; i < entries.length; i++) {
      cursor += entries[i].value / total * 2 * math.pi;
      if (angle <= cursor) {
        setState(() => _selected = i);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final entries = _entries;
    if (entries.isEmpty) return const _EmptyChart(label: 'Chưa có dữ liệu chi tiêu');
    final total = entries.fold<double>(0, (sum, entry) => sum + entry.value);
    final selected = _selected != null && _selected! < entries.length ? entries[_selected!] : null;
    return Column(
      children: [
        SizedBox(
          height: 190,
          child: LayoutBuilder(builder: (context, constraints) {
            final size = Size(constraints.maxWidth, constraints.maxHeight);
            return GestureDetector(
              onTapDown: (details) => _selectAt(details.localPosition, size),
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, _) => CustomPaint(
                  size: size,
                  painter: _DonutPainter(entries: entries, progress: Curves.easeOutCubic.transform(_controller.value), selectedIndex: _selected),
                ),
              ),
            );
          }),
        ),
        Text(selected?.key ?? 'Tổng chi tháng này', style: const TextStyle(color: Color(0xFF7C8498), fontWeight: FontWeight.w600)),
        const SizedBox(height: 3),
        Text(_money(selected?.value ?? total), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF202744))),
        const SizedBox(height: 16),
        Wrap(
          spacing: 14,
          runSpacing: 10,
          alignment: WrapAlignment.center,
          children: entries.take(6).map((entry) {
            final color = categoryColor(entry.key);
            final percent = total == 0 ? 0 : entry.value / total * 100;
            return Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Text('${entry.key} ${percent.toStringAsFixed(0)}%', style: const TextStyle(fontSize: 11, color: Color(0xFF6D758B))),
            ]);
          }).toList(),
        ),
      ],
    );
  }
}

class _DonutPainter extends CustomPainter {
  const _DonutPainter({required this.entries, required this.progress, this.selectedIndex});

  final List<MapEntry<String, double>> entries;
  final double progress;
  final int? selectedIndex;

  @override
  void paint(Canvas canvas, Size size) {
    final total = entries.fold<double>(0, (sum, entry) => sum + entry.value);
    if (total <= 0) return;
    final side = size.shortestSide * .86;
    final rect = Rect.fromCenter(center: Offset(size.width / 2, size.height / 2), width: side, height: side);
    var start = -math.pi / 2;
    for (var i = 0; i < entries.length; i++) {
      final sweep = entries[i].value / total * 2 * math.pi * progress;
      final paint = Paint()
        ..color = categoryColor(entries[i].key)
        ..style = PaintingStyle.stroke
        ..strokeWidth = i == selectedIndex ? 24 : 18
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(rect, start + .012, math.max(0, sweep - .024).toDouble(), false, paint);
      start += entries[i].value / total * 2 * math.pi * progress;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.entries != entries || oldDelegate.progress != progress || oldDelegate.selectedIndex != selectedIndex;
}

class WeeklyBarChart extends StatefulWidget {
  const WeeklyBarChart({super.key, required this.values});

  /// Values are ordered from six days ago through today.
  final List<double> values;

  @override
  State<WeeklyBarChart> createState() => _WeeklyBarChartState();
}

class _WeeklyBarChartState extends State<WeeklyBarChart> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  int _selected = 6;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..forward();
  }

  @override
  void didUpdateWidget(covariant WeeklyBarChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.values != widget.values) _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.values.isEmpty) return const _EmptyChart(label: 'Chưa có dữ liệu tuần này');
    final safeSelected = _selected.clamp(0, widget.values.length - 1).toInt();
    final date = DateTime.now().subtract(Duration(days: widget.values.length - 1 - safeSelected));
    final labels = List.generate(
      widget.values.length,
      (index) => _weekday(DateTime.now().subtract(Duration(days: widget.values.length - 1 - index)).weekday),
    );
    return Column(children: [
      SizedBox(
        height: 178,
        child: LayoutBuilder(builder: (context, constraints) {
          final size = Size(constraints.maxWidth, constraints.maxHeight);
          return GestureDetector(
            onTapDown: (details) {
              final index = ((details.localPosition.dx / size.width) * widget.values.length).floor().clamp(0, widget.values.length - 1).toInt();
              setState(() => _selected = index);
            },
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) => CustomPaint(
                size: size,
                painter: _BarsPainter(values: widget.values, labels: labels, progress: Curves.easeOutCubic.transform(_controller.value), selected: safeSelected),
              ),
            ),
          );
        }),
      ),
      const SizedBox(height: 8),
      Text('${_weekday(date.weekday)}  •  ${_money(widget.values[safeSelected])}', style: const TextStyle(color: Color(0xFF7C8498), fontWeight: FontWeight.w600)),
    ]);
  }
}

class _BarsPainter extends CustomPainter {
  const _BarsPainter({required this.values, required this.labels, required this.progress, required this.selected});
  final List<double> values;
  final List<String> labels;
  final double progress;
  final int selected;

  @override
  void paint(Canvas canvas, Size size) {
    const left = 8.0;
    const right = 8.0;
    const top = 8.0;
    const bottom = 27.0;
    final chartHeight = size.height - top - bottom;
    final maxValue = math.max(1.0, values.fold<double>(0, (a, b) => math.max(a, b).toDouble())).toDouble();
    final slot = (size.width - left - right) / values.length;
    final barWidth = math.min(22.0, slot * .48).toDouble();
    for (var i = 0; i < values.length; i++) {
      final height = math.max(5.0, chartHeight * values[i] / maxValue * progress).toDouble();
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(left + slot * i + (slot - barWidth) / 2, top + chartHeight - height, barWidth, height),
        const Radius.circular(7),
      );
      final paint = Paint()..color = i == selected ? const Color(0xFF5C6CF5) : const Color(0xFFDDE2FF);
      canvas.drawRRect(rect, paint);
      final text = TextPainter(
        text: TextSpan(text: i < labels.length ? labels[i] : '', style: const TextStyle(fontSize: 10, color: Color(0xFF99A0B2))),
        textDirection: TextDirection.ltr,
      )..layout();
      text.paint(canvas, Offset(left + slot * i + (slot - text.width) / 2, size.height - 17));
    }
  }

  @override
  bool shouldRepaint(covariant _BarsPainter oldDelegate) => oldDelegate.values != values || oldDelegate.labels != labels || oldDelegate.progress != progress || oldDelegate.selected != selected;
}

class _EmptyChart extends StatelessWidget {
  const _EmptyChart({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => SizedBox(height: 145, child: Center(child: Text(label, style: const TextStyle(color: Color(0xFF9AA1B2)))));
}

String _money(double value) => '${value.round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.')} ₫';
String _weekday(int weekday) => const ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'][weekday - 1];


