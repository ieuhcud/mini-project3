# Minto — Mini-Project #3: OCR Expense Tracker

Ứng dụng theo dõi chi tiêu cá nhân và đọc thông tin hóa đơn. Tên sản phẩm là **Minto**.

**Người thực hiện:** Đức Trọng · trongnd.23itb@vku.udn.vn  
**Phạm vi:** repository giữ lại bản Flutter/Dart ban đầu và có thêm bản chuyển sang Expo/React Native. Bản Expo nằm trong [expo/](./expo/README.md); báo cáo kỹ thuật ở [BAO_CAO_DU_AN.md](./BAO_CAO_DU_AN.md).

## Tính năng

- Chụp hoặc chọn ảnh hóa đơn.
- Nhận dạng chữ bằng Google ML Kit trên thiết bị Android/iOS.
- Dùng heuristic/regex để gợi ý cửa hàng, tổng tiền và ngày; người dùng có thể kiểm tra, sửa trước khi lưu.
- Nhập khoản chi thủ công, chọn danh mục, ngày, ghi chú; lưu trên thiết bị.
- Xem tổng chi tháng, tiến độ ngân sách, biểu đồ theo danh mục và theo 7 ngày.
- Không có máy chủ/backend; ảnh và giao dịch không được gửi lên dịch vụ bên ngoài.

## Bản Expo/React Native

Mở terminal trong thư mục expo:

~~~sh
pnpm install
pnpm start
~~~

Để dùng ML Kit OCR, cần development build có native module; Expo Go chỉ phù hợp để xem giao diện và nhập giao dịch thủ công. Xem [expo/README.md](./expo/README.md) để biết yêu cầu Android/iOS, đăng nhập Expo Go trên iPhone và cách chạy development build.

## Bản Flutter/Dart ban đầu

Thư mục lib/ giữ lại phiên bản Flutter của bài:

~~~sh
flutter pub get
flutter run
~~~

Phiên bản này dùng google_mlkit_text_recognition, shared_preferences và CustomPainter cho biểu đồ. OCR ML Kit chạy trên Android/iOS, không chạy trên Flutter Web.

## Cấu trúc repository

~~~text
mini-project3/
├── expo/                  # Bản Expo/React Native hiện dùng để chạy Expo
│   ├── src/app/           # Màn hình Expo Router
│   ├── src/components/    # Biểu đồ SVG có animation và tương tác
│   ├── src/models/        # Kiểu dữ liệu, danh mục, định dạng tiền/ngày
│   └── src/services/      # OCR, parser hóa đơn, lưu trữ SQLite
├── lib/                   # Bản Flutter/Dart ban đầu
├── test/                  # Thư mục kiểm thử Flutter
├── README.md              # Hướng dẫn chung
└── BAO_CAO_DU_AN.md       # Báo cáo Mini-Project #3
~~~

## Giới hạn cần biết

- OCR trên bản Expo cần cài development build riêng; module ML Kit không có sẵn trong Expo Go. Bản web chỉ hỗ trợ nhập giao dịch thủ công.
- Bộ trích xuất dựa trên quy tắc và định dạng thường gặp, nên kết quả OCR/parser cần được người dùng xác minh.
- Dữ liệu hiện lưu cục bộ trên thiết bị, chưa đồng bộ giữa nhiều máy và chưa có tài khoản người dùng.
- Các ảnh chụp màn hình nghiệm thu chưa được thêm vào repository.

