import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../models/expense.dart';
import '../services/receipt_parser.dart';

class ReceiptEntryScreen extends StatefulWidget {
  const ReceiptEntryScreen({super.key, this.initialSource});
  final String? initialSource;

  @override
  State<ReceiptEntryScreen> createState() => _ReceiptEntryScreenState();
}

class _ReceiptEntryScreenState extends State<ReceiptEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _merchantController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  final _picker = ImagePicker();
  XFile? _image;
  String? _rawText;
  String _category = 'Ăn uống';
  DateTime _date = DateTime.now();
  bool _scanning = false;
  bool _hasParsed = false;
  String? _scanError;

  @override
  void initState() {
    super.initState();
    if (widget.initialSource == 'camera') WidgetsBinding.instance.addPostFrameCallback((_) => _pick(ImageSource.camera));
  }

  @override
  void dispose() {
    _merchantController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    try {
      final image = await _picker.pickImage(source: source, imageQuality: 88, maxWidth: 2200);
      if (image == null || !mounted) return;
      setState(() {
        _image = image;
        _scanError = null;
        _rawText = null;
      });
      await _recognize(image);
    } on PlatformException catch (error) {
      if (mounted) setState(() => _scanError = error.message ?? 'Không thể mở ảnh.');
    }
  }

  Future<void> _recognize(XFile image) async {
    if (kIsWeb || !(Platform.isAndroid || Platform.isIOS)) {
      setState(() => _scanError = 'ML Kit hiện chỉ hỗ trợ OCR trên Android và iOS. Bạn vẫn có thể nhập thông tin thủ công.');
      return;
    }
    setState(() {
      _scanning = true;
      _scanError = null;
    });
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final recognized = await recognizer.processImage(InputImage.fromFilePath(image.path));
      final draft = ReceiptParser.parse(recognized.text);
      if (!mounted) return;
      setState(() {
        _rawText = recognized.text;
        _merchantController.text = draft.merchant == 'Chưa nhận diện' ? '' : draft.merchant;
        _amountController.text = draft.amount > 0 ? draft.amount.round().toString() : '';
        _date = draft.date;
        _hasParsed = true;
        if (draft.amount == 0) _scanError = 'Chưa tìm thấy tổng tiền rõ ràng. Hãy kiểm tra và nhập lại.';
      });
    } catch (_) {
      if (mounted) setState(() => _scanError = 'Không đọc được ảnh này. Hãy thử ảnh rõ, đủ sáng hoặc nhập thủ công.');
    } finally {
      await recognizer.close();
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _chooseImage() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Align(alignment: Alignment.centerLeft, child: Text('Thêm ảnh hóa đơn', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
            const SizedBox(height: 12),
            ListTile(leading: const Icon(Icons.camera_alt_outlined), title: const Text('Chụp ảnh'), onTap: () { Navigator.pop(context); _pick(ImageSource.camera); }),
            ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Chọn từ thư viện'), onTap: () { Navigator.pop(context); _pick(ImageSource.gallery); }),
          ]),
        ),
      ),
    );
  }

  Future<void> _selectDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2018),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      locale: const Locale('vi', 'VN'),
    );
    if (selected != null && mounted) setState(() => _date = selected);
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    final amount = double.parse(_amountController.text.replaceAll(RegExp(r'[^0-9]'), ''));
    Navigator.of(context).pop(Expense(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      merchant: _merchantController.text.trim(),
      amount: amount,
      date: _date,
      category: _category,
      note: _noteController.text.trim(),
      receiptPath: _image?.path,
    ));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Thêm khoản chi', style: TextStyle(fontWeight: FontWeight.w800)), centerTitle: false),
        bottomNavigationBar: SafeArea(
          minimum: const EdgeInsets.fromLTRB(20, 10, 20, 14),
          child: FilledButton.icon(onPressed: _save, icon: const Icon(Icons.check_rounded), label: const Text('Lưu giao dịch'), style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54))),
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            children: [
              _receiptPicker(),
              if (_scanning) const Padding(padding: EdgeInsets.only(top: 12), child: LinearProgressIndicator()),
              if (_scanError != null) _message(_scanError!, warning: true),
              if (_hasParsed && _scanError == null) _message('Đã phân tích hóa đơn trên thiết bị. Vui lòng kiểm tra các trường trước khi lưu.'),
              const SizedBox(height: 20),
              _label('Cửa hàng'),
              TextFormField(controller: _merchantController, textCapitalization: TextCapitalization.words, decoration: _inputDecoration('Ví dụ: Cửa hàng tiện lợi', Icons.storefront_outlined), validator: (value) => value == null || value.trim().isEmpty ? 'Nhập tên cửa hàng' : null),
              const SizedBox(height: 16),
              _label('Tổng thanh toán'),
              TextFormField(controller: _amountController, keyboardType: const TextInputType.numberWithOptions(decimal: false), inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))], decoration: _inputDecoration('0', Icons.payments_outlined, suffix: '₫'), validator: (value) => value == null || value.replaceAll(RegExp(r'[^0-9]'), '').isEmpty ? 'Nhập số tiền hợp lệ' : null),
              const SizedBox(height: 16),
              _label('Ngày giao dịch'),
              OutlinedButton.icon(onPressed: _selectDate, icon: const Icon(Icons.calendar_today_outlined, size: 18), label: Text(DateFormat('dd/MM/yyyy').format(_date)), style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft, minimumSize: const Size.fromHeight(50), foregroundColor: const Color(0xFF303754), side: const BorderSide(color: Color(0xFFE0E4EF)))),
              const SizedBox(height: 18),
              _label('Danh mục'),
              Wrap(spacing: 8, runSpacing: 8, children: expenseCategories.map((category) {
                final selected = _category == category.name;
                return ChoiceChip(
                  selected: selected,
                  onSelected: (_) => setState(() => _category = category.name),
                  avatar: Icon(category.icon, size: 16, color: selected ? Colors.white : category.color),
                  label: Text(category.name),
                  selectedColor: const Color(0xFF5C6CF5),
                  labelStyle: TextStyle(color: selected ? Colors.white : const Color(0xFF505870), fontWeight: FontWeight.w600, fontSize: 12),
                  side: BorderSide(color: selected ? Colors.transparent : const Color(0xFFE0E4EF)),
                );
              }).toList()),
              const SizedBox(height: 16),
              _label('Ghi chú (không bắt buộc)'),
              TextFormField(controller: _noteController, maxLines: 2, decoration: _inputDecoration('Thêm mô tả ngắn', Icons.notes_rounded)),
              if (_rawText != null && _rawText!.isNotEmpty) ...[
                const SizedBox(height: 14),
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: const Text('Xem văn bản OCR', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  children: [Container(width: double.infinity, padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFF0F2F8), borderRadius: BorderRadius.circular(12)), child: SelectableText(_rawText!, style: const TextStyle(fontSize: 12, height: 1.5)))],
                ),
              ],
              const SizedBox(height: 80),
            ],
          ),
        ),
      );

  Widget _receiptPicker() => GestureDetector(
        onTap: _chooseImage,
        child: Container(
          height: 188,
          width: double.infinity,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(color: const Color(0xFFEAEDFA), borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFDCE1F4))),
          child: _image == null
              ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Container(width: 52, height: 52, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17)), child: const Icon(Icons.document_scanner_outlined, color: Color(0xFF5C6CF5), size: 25)),
                  const SizedBox(height: 10),
                  const Text('Quét hóa đơn bằng AI', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF303754))),
                  const SizedBox(height: 4),
                  const Text('Chụp ảnh hoặc chọn từ thư viện', style: TextStyle(fontSize: 12, color: Color(0xFF7F879D))),
                ])
              : Stack(fit: StackFit.expand, children: [
                  Image.file(File(_image!.path), fit: BoxFit.cover),
                  Align(alignment: Alignment.bottomCenter, child: Container(height: 44, color: Colors.black54, alignment: Alignment.center, child: Text(_scanning ? 'Đang đọc hóa đơn…' : 'Chạm để đổi ảnh', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)))),
                ]),
        ),
      );

  Widget _label(String value) => Padding(padding: const EdgeInsets.only(bottom: 7), child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF333A55))));

  InputDecoration _inputDecoration(String hint, IconData icon, {String? suffix}) => InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, size: 20, color: const Color(0xFF9098AE)),
        suffixText: suffix,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xFFE0E4EF))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xFFE0E4EF))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xFF5C6CF5), width: 1.5)),
      );

  Widget _message(String text, {bool warning = false}) => Container(
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: warning ? const Color(0xFFFFF3E7) : const Color(0xFFEAF7F2), borderRadius: BorderRadius.circular(13)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(warning ? Icons.info_outline_rounded : Icons.verified_outlined, size: 18, color: warning ? const Color(0xFFB56B21) : const Color(0xFF2D9B78)),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(fontSize: 12, height: 1.4, color: warning ? const Color(0xFF8A541D) : const Color(0xFF287A63)))),
        ]),
      );
}
