# BÁO CÁO KỸ THUẬT MINI-PROJECT #3
**Đề tài:** OCR Expense Tracker & Receipt Parser  
**Tên ứng dụng:** Minto  
**Học phần:** Phát triển ứng dụng di động đa nền tảng (VKU)  
**Người thực hiện:** Đức Trọng — trongnd.23itb@vku.udn.vn  
**MSSV / nhóm:** chưa có thông tin  
**Ngày lập báo cáo:** 06/10/2026  
**Phạm vi báo cáo:** bản Expo/React Native trong thư mục expo/. Bản Flutter/Dart gốc được giữ ở thư mục lib/.

---

## 1. TỔNG QUAN VÀ MỤC TIÊU

Minto là ứng dụng quản lý chi tiêu cá nhân, hỗ trợ ghi nhận giao dịch từ hóa đơn. Người dùng có thể chụp/chọn ảnh, chạy nhận dạng văn bản trên thiết bị, nhận các gợi ý về cửa hàng, số tiền và ngày giao dịch, sau đó kiểm tra và chỉnh sửa trước khi lưu. Ứng dụng cũng có luồng nhập thủ công để dùng khi không có hóa đơn hoặc OCR không nhận dạng được.

Bài Mini-Project #3 đặt trọng tâm vào xử lý hóa đơn ngoại tuyến, phân tích văn bản bằng heuristic/regex và trực quan hóa chi tiêu. Repository ban đầu có phiên bản Flutter/Dart. Theo yêu cầu chuyển sang Expo, báo cáo này mô tả bản Expo/React Native bổ sung trong expo/; mã Flutter ban đầu vẫn được giữ lại. Vì vậy, hai bản có cùng mục tiêu sản phẩm nhưng dùng cách triển khai khác nhau.

## 2. THÔNG TIN SẢN PHẨM VÀ CÔNG NGHỆ

| Hạng mục | Nội dung |
|---|---|
| Tên ứng dụng | Minto — OCR Expense Tracker |
| Nền tảng bản báo cáo | Expo / React Native; Android và iOS, có cấu hình Web |
| Ngôn ngữ bản Expo | TypeScript |
| Nền tảng framework | Expo SDK 57, React Native 0.86.3, Expo Router |
| Nhận dạng hóa đơn | Google ML Kit qua expo-mlkit-ocr, xử lý cục bộ |
| Chọn ảnh/camera | expo-image-picker |
| Lưu trữ | expo-sqlite/kv-store, dưới dạng JSON cục bộ |
| Biểu đồ | react-native-svg và React Native Animated |
| Backend | Chưa có; ứng dụng không đồng bộ giao dịch qua máy chủ |

## 3. CÁC TÍNH NĂNG ĐÃ TRIỂN KHAI

| # | Tính năng | Trạng thái | Cách triển khai |
|:---:|---|:---:|---|
| 1 | Tổng quan chi tiêu tháng | ✅ Hoàn thành | Cộng giao dịch trong tháng, chuyển tháng, hiển thị ngân sách mặc định 5.000.000 ₫ và tiến độ sử dụng. |
| 2 | Chụp/chọn ảnh hóa đơn | ✅ Hoàn thành | Dùng camera hoặc thư viện ảnh qua Expo Image Picker; yêu cầu quyền camera khi cần. |
| 3 | OCR trên thiết bị | ✅ Có mã nguồn; cần development build | Gọi ML Kit trên Android/iOS. Module native không nằm trong Expo Go; Web báo không hỗ trợ OCR và vẫn cho nhập thủ công. |
| 4 | Gợi ý cửa hàng, tổng tiền, ngày | ✅ Hoàn thành theo heuristic | Chuẩn hóa dấu tiếng Việt, tìm ngày theo định dạng thường gặp, ưu tiên số tiền trên dòng có nhãn tổng/thanh toán/phải trả và chọn dòng đầu phù hợp làm tên cửa hàng. |
| 5 | Kiểm tra và sửa dữ liệu OCR | ✅ Hoàn thành | Form cho phép sửa cửa hàng, tiền, ngày, danh mục, ghi chú và văn bản OCR trước khi lưu. |
| 6 | Giao dịch thủ công và quản lý | ✅ Hoàn thành một phần | Có tạo giao dịch, lưu/đọc, cập nhật khi mở form với ID và xóa giao dịch bằng thao tác nhấn giữ trên danh sách. |
| 7 | Lưu trên thiết bị | ✅ Hoàn thành | expo-sqlite/kv-store lưu JSON dưới khóa phiên bản minto.expenses.v1; lần đầu khởi chạy tạo dữ liệu mẫu. |
| 8 | Biểu đồ tương tác | ✅ Hoàn thành | Donut theo danh mục và biểu đồ cột 7 ngày; có animation, nhấn để xem giá trị. |
| 9 | Đồng bộ tài khoản/đám mây | ❌ Chưa triển khai | Không có xác thực người dùng, backend hoặc đồng bộ nhiều thiết bị. |

## 4. KIẾN TRÚC VÀ LUỒNG XỬ LÝ

Ứng dụng Expo dùng Expo Router với hai route chính: src/app/index.tsx cho trang tổng quan và src/app/receipt.tsx cho form thêm/sửa giao dịch, chụp ảnh và xác nhận dữ liệu hóa đơn. Các phần dữ liệu và nghiệp vụ được tách khỏi giao diện để dễ bảo trì:

- src/models/expense.ts: kiểu giao dịch, sáu danh mục chi tiêu, màu sắc và hàm định dạng tiền/ngày.
- src/services/ocr.ts: gọi ML Kit trên Android/iOS; chặn OCR trên Web.
- src/services/receiptParser.ts: chuẩn hóa dấu tiếng Việt, phát hiện ngày, chấm điểm các dòng có nhãn tổng tiền, chọn merchant và tạo mức tin cậy gợi ý.
- src/services/expenseStore.ts: đọc/ghi giao dịch cục bộ và tạo năm giao dịch mẫu khi bộ nhớ chưa có dữ liệu.
- src/components/ExpenseCharts.tsx: dựng biểu đồ donut/cột bằng SVG, Animated và tương tác chạm.

**Luồng quét hóa đơn:** người dùng chọn/chụp ảnh → ứng dụng gọi OCR trên thiết bị → parser tạo bản nháp → các trường được điền gợi ý vào form → người dùng xác minh/chỉnh sửa → ứng dụng kiểm tra tên, số tiền lớn hơn 0 và ngày hợp lệ → giao dịch được lưu cục bộ và quay về trang tổng quan. Nếu OCR không khả dụng, ảnh vẫn được giữ trong form để người dùng nhập dữ liệu thủ công.

**Tính riêng tư:** ảnh và văn bản hóa đơn không được gửi lên backend vì hiện không có backend. Giao dịch lưu trong bộ nhớ cục bộ của ứng dụng. Ảnh được tham chiếu qua URI do bộ chọn ảnh trả về; ứng dụng chưa xây dựng cơ chế sao lưu/đồng bộ hoặc mã hóa riêng cho dữ liệu.

## 5. THUẬT TOÁN PARSER VÀ BIỂU ĐỒ

Parser chia văn bản OCR thành từng dòng và chuẩn hóa dấu để nhận diện nhãn tiếng Việt/tiếng Anh như “tổng thanh toán”, “phải trả”, “total due” hoặc “amount due”. Mỗi số tiền tìm được trở thành ứng viên; các dòng có nhãn tổng được ưu tiên, trong khi subtotal, thuế và giảm giá bị giảm điểm. Ngày được tìm theo dạng ngày/tháng/năm hoặc năm-tháng-ngày. Merchant được suy ra từ một dòng ngắn ở phần đầu hóa đơn, đồng thời loại bỏ các dòng thường là tiêu đề hóa đơn, số điện thoại, mã số thuế, URL hoặc chứa nhiều chữ số.

Mức tin cậy đang là điểm gợi ý tổng hợp dựa trên việc có tìm thấy merchant, số tiền và ngày; đây không phải xác suất được hiệu chuẩn. Hóa đơn đa dạng bố cục, ngôn ngữ và cách viết số tiền có thể khiến parser chọn nhầm. Vì vậy, ứng dụng luôn yêu cầu người dùng xem lại trường đã điền.

Biểu đồ donut hiển thị tỷ trọng tổng chi theo sáu danh mục. Biểu đồ cột tổng hợp bảy ngày gần nhất; chạm một lát/cột để làm nổi bật và xem số tiền. Bản Expo dùng react-native-svg thay cho CustomPainter. Phiên bản Flutter gốc trong repository dùng CustomPainter tại lib/widgets/expense_charts.dart.

## 6. CẤU TRÚC SOURCE VÀ CÁCH CHẠY

~~~text
mini-project3/
├── expo/
│   ├── src/app/                 # Trang tổng quan và form hóa đơn
│   ├── src/components/          # Biểu đồ
│   ├── src/models/              # Kiểu dữ liệu và danh mục
│   └── src/services/            # OCR, parser, lưu trữ
├── lib/                         # Phiên bản Flutter/Dart gốc
├── test/                        # Thư mục kiểm thử Flutter
├── README.md
└── BAO_CAO_DU_AN.md
~~~

Khởi chạy bản Expo:

~~~sh
cd expo
pnpm install
pnpm start
~~~

Expo Go có thể dùng để xem giao diện và nhập giao dịch thủ công. OCR ML Kit cần development build trên thiết bị Android/iOS; trên máy phát triển Android cần cài Android Studio/SDK trước khi chạy pnpm android. Sau khi cài development build, khởi động Metro bằng pnpm exec expo start --dev-client. iOS native build cần macOS/Xcode. Trên iPhone thật dùng Expo Go với SDK 57, Expo CLI và Expo Go phải đăng nhập cùng tài khoản Expo.

Phiên bản Flutter ban đầu có thể chạy từ thư mục gốc bằng flutter pub get và flutter run; chi tiết được ghi trong README.

## 7. KIỂM CHỨNG, GIỚI HẠN VÀ HƯỚNG PHÁT TRIỂN

Trong lần hoàn thiện tài liệu này, mã nguồn được đối chiếu để mô tả tính năng; không thực hiện build native, lint hay typecheck. Môi trường phát triển đang dùng không có Android SDK/Android Studio, và repository Expo chưa có cấu hình EAS eas.json, nên báo cáo không khẳng định đã cài đặt hoặc nghiệm thu OCR trên thiết bị. Chưa có ảnh chụp màn hình sạch, video demo hoặc URL repository Mini-Project #3 được cung cấp; không dùng ảnh dựng thay cho minh chứng thực tế.

Các giới hạn chính là độ chính xác phụ thuộc chất lượng ảnh/OCR và quy tắc parser; ngân sách 5 triệu đồng đang cố định trong mã; dữ liệu chỉ lưu trên thiết bị; chưa có luồng mở/sửa giao dịch hoàn chỉnh từ trang tổng quan; không OCR trên Web; và bản Expo cần development build cho ML Kit. Bản port sang TypeScript cũng khác yêu cầu công nghệ Flutter/Dart ban đầu. Phiên bản Flutter gốc vẫn được giữ lại để đối chiếu mục tiêu học tập của đề bài.

Các bước có thể phát triển tiếp: thêm bộ hóa đơn mẫu để kiểm tra parser, cho phép cấu hình ngân sách/danh mục, hoàn thiện luồng mở và sửa giao dịch, bổ sung lưu trữ ảnh có vòng đời rõ ràng, tạo development build và kiểm tra thật trên Android/iOS, sau đó chụp minh chứng giao diện. Nếu cần đồng bộ, có thể thiết kế backend riêng nhưng cần bổ sung chính sách bảo vệ dữ liệu hóa đơn.

## 8. KẾT LUẬN

Minto cung cấp quy trình cơ bản để ghi chép chi tiêu và biến văn bản hóa đơn thành bản nháp giao dịch có thể hiệu chỉnh. Phiên bản Expo hiện có dashboard, nhập thủ công, camera/thư viện ảnh, tích hợp mã nguồn ML Kit, parser heuristic, lưu cục bộ và biểu đồ tương tác. Báo cáo phân biệt rõ phần đã có trong source với những phần chưa được build/kiểm thử trên thiết bị. Repository đồng thời giữ lại bản Flutter/Dart ban đầu để bảo toàn hướng triển khai theo yêu cầu môn học.

### Tài liệu tham khảo

- [Expo: Expo Go yêu cầu đăng nhập trên iPhone thật](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/)
- [Expo: Giới thiệu development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo: Giới hạn của Expo Go với native module](https://docs.expo.dev/develop/development-builds/faq/)

