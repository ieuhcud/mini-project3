# Minto · Expense Tracker & Receipt Parser

Mini-Project #3 được triển khai thành bản Expo/React Native trong thư mục này. Báo cáo kỹ thuật và README tổng quan ở [thư mục gốc](../README.md) và [báo cáo dự án](../BAO_CAO_DU_AN.md). Phiên bản Flutter/Dart ban đầu được giữ tại ../lib/.

## Tính năng

- Chụp ảnh bằng camera hoặc chọn hóa đơn từ thư viện.
- Google ML Kit nhận dạng chữ trên thiết bị Android/iOS.
- Heuristic/regex gợi ý cửa hàng, tổng tiền và ngày giao dịch từ văn bản OCR.
- Xác minh, chỉnh sửa thông tin nhận dạng trước khi lưu; thêm khoản chi thủ công.
- Lưu giao dịch cục bộ bằng expo-sqlite/kv-store; không cần backend.
- Tổng chi theo tháng, tiến độ ngân sách mặc định 5.000.000 ₫, biểu đồ donut theo danh mục và biểu đồ cột 7 ngày có animation/tương tác.

## Cài đặt và chạy

Yêu cầu Node.js tương thích với Expo SDK 57 và pnpm. Tại thư mục này:

~~~sh
pnpm install
pnpm start
~~~

Mở project trong Expo Go để xem giao diện. Trên iPhone thật, Expo SDK 57 yêu cầu Expo CLI và Expo Go đăng nhập cùng tài khoản; nếu chưa có tài khoản, có thể tạo miễn phí tại [expo.dev/signup](https://expo.dev/signup). Bấm lại **Try again** sau khi đăng nhập.

### Bật OCR ML Kit

expo-mlkit-ocr chứa native code nên OCR không chạy trong Expo Go. Cần build và cài development client:

~~~sh
pnpm android
pnpm exec expo start --dev-client
~~~

Lệnh build Android cần Android Studio và Android SDK đã cài/cấu hình. iOS native build yêu cầu macOS/Xcode. Các thư mục native của Expo được sinh bởi Expo Prebuild; không chỉnh tay. Trong môi trường Windows hiện tại, Android SDK chưa được cài, do đó chưa xác nhận build native tại máy này.

Web Preview có thể chạy bằng:

~~~sh
pnpm web
~~~

OCR không hỗ trợ Web; hãy dùng luồng nhập thủ công.

## Cấu trúc

~~~text
src/
├── app/
│   ├── _layout.tsx             # Stack navigation
│   ├── index.tsx               # Dashboard, ngân sách và giao dịch
│   └── receipt.tsx             # Form thêm/sửa, chọn ảnh và xác nhận OCR
├── components/
│   └── ExpenseCharts.tsx       # Donut/cột SVG, animation và tương tác
├── models/
│   └── expense.ts              # Kiểu dữ liệu, danh mục, định dạng
└── services/
    ├── expenseStore.ts         # Lưu/đọc dữ liệu cục bộ
    ├── ocr.ts                  # Cầu nối native ML Kit
    └── receiptParser.ts        # Parser heuristic/regex
~~~

## Cách parser hoạt động

Parser chuẩn hóa dấu tiếng Việt, dò ngày theo các định dạng phổ biến và trích số tiền trên từng dòng. Từ khóa như “tổng thanh toán”, “phải trả”, “total due” được ưu tiên; subtotal, thuế và giảm giá được hạ điểm. Một dòng ngắn ở phần đầu được dùng làm gợi ý cửa hàng sau khi loại các dòng thường gặp như tiêu đề hóa đơn, ngày, điện thoại, mã số thuế và URL.

Parser chỉ đưa ra gợi ý. Hãy đối chiếu dữ liệu với hóa đơn, nhất là tổng tiền và ngày, trước khi lưu.

## Dữ liệu và quyền riêng tư

Giao dịch được lưu trên thiết bị dưới khóa minto.expenses.v1. Lần đầu chạy, ứng dụng tạo vài giao dịch mẫu để dashboard có dữ liệu minh họa. Ảnh/văn bản không được gửi lên máy chủ vì dự án hiện chưa có backend; bản Expo cũng chưa có đồng bộ đám mây hoặc tài khoản người dùng.

