class ReceiptDraft {
  const ReceiptDraft({
    required this.merchant,
    required this.amount,
    required this.date,
    required this.rawText,
    required this.confidence,
  });

  final String merchant;
  final double amount;
  final DateTime date;
  final String rawText;
  final double confidence;
}

/// Heuristic parser for common Vietnamese and international receipt layouts.
/// It deliberately returns editable guesses; OCR text is never treated as truth.
class ReceiptParser {
  static final _datePattern = RegExp(
    r'\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b|\b(20\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})\b',
  );
  static final _moneyPattern = RegExp(
    r'(?:₫|đ|vnd)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:₫|đ|vnd)?',
    caseSensitive: false,
  );
  static final _totalWords = RegExp(
    r'tong\s*(?:thanh\s*toan|cong|tien)?|thanh\s*toan|phai\s*tra|can\s*tra|total\s*due|grand\s*total|amount\s*due|net\s*total|total',
    caseSensitive: false,
  );

  static ReceiptDraft parse(String rawText, {DateTime? now}) {
    final lines = rawText
        .split(RegExp(r'[\r\n]+'))
        .map((line) => line.replaceAll(RegExp(r'\s+'), ' ').trim())
        .where((line) => line.isNotEmpty)
        .toList();
    final currentDate = now ?? DateTime.now();

    final date = _findDate(rawText) ?? currentDate;
    final amountCandidates = <({double amount, int score})>[];
    for (final line in lines) {
      final normalized = _foldVietnamese(line);
      final keywordMatch = _totalWords.firstMatch(normalized);
      final amountText = line.replaceAll(_datePattern, ' ');
      for (final match in _moneyPattern.allMatches(amountText)) {
        final amount = _parseAmount(match.group(1) ?? '', match.group(2));
        if (amount <= 0 || amount > 100000000000) continue;
        final score = (keywordMatch != null ? 100 : 0) +
            (normalized.contains('subtotal') ? -25 : 0) +
            (normalized.contains('tax') || normalized.contains('thue') ? -20 : 0) +
            (normalized.contains('discount') || normalized.contains('giam gia') ? -35 : 0);
        amountCandidates.add((amount: amount, score: score));
      }
    }

    amountCandidates.sort((a, b) {
      final byScore = b.score.compareTo(a.score);
      return byScore != 0 ? byScore : b.amount.compareTo(a.amount);
    });
    final amount = amountCandidates.isEmpty ? 0.0 : amountCandidates.first.amount;

    final merchant = _findMerchant(lines);
    final confidence = (merchant != 'Chưa nhận diện' ? 0.35 : 0.0) +
        (amount > 0 ? 0.45 : 0.0) +
        (_findDate(rawText) != null ? 0.2 : 0.0);

    return ReceiptDraft(
      merchant: merchant,
      amount: amount,
      date: date,
      rawText: rawText,
      confidence: confidence,
    );
  }

  static double _parseAmount(String integerPart, String? decimalPart) {
    final digits = integerPart.replaceAll(RegExp(r'[^\d]'), '');
    if (digits.isEmpty) return 0;
    // Receipt amounts are usually integer VND. Treat a short decimal suffix as
    // fractional only when the OCR produced an explicit decimal part.
    if (decimalPart != null && decimalPart.isNotEmpty) {
      final whole = double.tryParse(digits) ?? 0;
      final fraction = double.tryParse(decimalPart) ?? 0;
      return whole + fraction / (decimalPart.length == 1 ? 10 : 100);
    }
    return double.tryParse(digits) ?? 0;
  }

  static DateTime? _findDate(String text) {
    final match = _datePattern.firstMatch(text);
    if (match == null) return null;
    try {
      if (match.group(1) != null) {
        var year = int.parse(match.group(3)!);
        if (year < 100) year += year >= 70 ? 1900 : 2000;
        return _safeDate(year, int.parse(match.group(2)!), int.parse(match.group(1)!));
      }
      return _safeDate(int.parse(match.group(4)!), int.parse(match.group(5)!), int.parse(match.group(6)!));
    } on FormatException {
      return null;
    }
  }

  static DateTime? _safeDate(int year, int month, int day) {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    final date = DateTime(year, month, day);
    if (date.year != year || date.month != month || date.day != day) return null;
    return date;
  }

  static String _findMerchant(List<String> lines) {
    final ignored = RegExp(
      r'(hoa don|invoice|receipt|ngay|date|cashier|nhan vien|ma so thue|mst|tel|phone|www\.|http|\d{2,})',
      caseSensitive: false,
    );
    for (final line in lines.take(8)) {
      final letters = RegExp(r'[A-Za-zÀ-ỹ]').allMatches(line).length;
      if (letters < 3 || line.length > 60 || ignored.hasMatch(_foldVietnamese(line))) continue;
      return line.replaceAll(RegExp(r'^[*#\-\s]+|[*#\-\s]+$'), '');
    }
    return 'Chưa nhận diện';
  }

  static String _foldVietnamese(String input) => input
      .toLowerCase()
      .replaceAll(RegExp('[àáạảãâầấậẩẫăằắặẳẵ]'), 'a')
      .replaceAll(RegExp('[èéẹẻẽêềếệểễ]'), 'e')
      .replaceAll(RegExp('[ìíịỉĩ]'), 'i')
      .replaceAll(RegExp('[òóọỏõôồốộổỗơờớợởỡ]'), 'o')
      .replaceAll(RegExp('[ùúụủũưừứựửữ]'), 'u')
      .replaceAll(RegExp('[ỳýỵỷỹ]'), 'y')
      .replaceAll('đ', 'd');
}

