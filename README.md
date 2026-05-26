# Google-Auto-Search

Google Auto-Search là một Userscript dành cho Tampermonkey hỗ trợ tự động hóa quá trình tìm kiếm từ khóa và truy tìm xếp hạng của một địa chỉ URL tương đối trên Google Search. Công cụ được thiết kế độc lập, phù hợp để kiểm tra và giám sát các trang web trên cả hai giao diện Máy tính (PC) và Điện thoại (Mobile).

## Tính năng cốt lõi

* Giao diện nổi thông minh: Hỗ trợ floating bubble và bảng điều khiển tương thích cho cả thao tác chuột (PC) lẫn cảm ứng (Mobile). Panel tự động bám theo và tính toán tọa độ để không bị tràn khỏi viewport.
* Kiểm tra trang trước khi chạy (Pre-flight Check): Sử dụng API cấp tiện ích mở rộng GM_xmlhttpRequest đóng vai trò gửi request ẩn kiểm tra trạng thái của URL đích, bỏ qua các hạn chế về CORS. Nếu trang sập hoặc lỗi, hệ thống sẽ thông báo và dừng tiến trình ngay lập tức.
* Mô phỏng hành vi nhập liệu: Tự động focus vào ô tìm kiếm của Google và gõ từng ký tự với độ trễ ngẫu nhiên từ 50ms đến 150ms để qua mặt cơ chế phát hiện bot tại chuỗi thời gian thực.
* Giả lập cuộn chuột ngắt quãng: Khi không tìm thấy kết quả ở trang hiện tại, script thực hiện cuộn màn hình xuống từ từ theo từng nhịp bất đồng bộ trước khi chuyển trang, mô phỏng chính xác cách người dùng đọc nội dung.
* Tự động quét và chuyển trang: Tự động bấm nút "Tiếp" trên PC hoặc "Xem thêm" trên Mobile để duyệt qua các trang kết quả (cho phép tùy chỉnh số trang tối đa).
* Điều hướng và Highlight: Khi phát hiện ra URL đích, hệ thống tự động cuộn phần tử vào giữa màn hình, highlight rực rỡ bằng CSS, tạm dừng từ 1.5 đến 3 giây để giả lập thao tác đọc tiêu đề rồi tự động click vào trang đích.
* Tạm dừng và Tiếp tục: Cho phép người dùng nhấn "Dừng" khi script đang chạy và "Tiếp tục" để hệ thống quét tiếp từ trang hiện tại mà không làm mất luồng.
* Tự động dọn dẹp trạng thái (State Cleanup): Nếu duyệt hết số trang giới hạn, hoặc khi người dùng chủ động ấn nút "Huỷ", script sẽ tự động xóa toàn bộ bộ nhớ tạm, xóa trắng form nhập liệu và quay trở về trang chủ Google ban đầu để tránh để lại trạng thái treo.

## Yêu cầu hệ thống

* Trình duyệt hỗ trợ extension (Chrome, Firefox, Edge, Brave, Kiwi Browser, Lemur Browser).
* Extension quản lý userscript: Tampermonkey.

## Hướng dẫn cài đặt

1. Cài đặt tiện ích mở rộng Tampermonkey cho trình duyệt của bạn thông qua các đường dẫn chính thức dưới đây:
   - Dành cho trình duyệt nhân Chromium (Chrome, Brave, Kiwi Browser, Lemur Browser, ...): [nhấn vào đây](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Dành cho Mozilla Firefox: [nhấn vào đây](https://addons.mozilla.org/vi/firefox/addon/tampermonkey/)

2. Sau khi đã cài đặt thành công Tampermonkey, [nhấn vào đây](https://raw.githubusercontent.com/vanhoanguyen241/Google-Auto-Search/main/GoogleAutoSearch.user.js) để tiến hành cài đặt script.

3. Giao diện của Tampermonkey sẽ tự động mở ra. Nhấn vào nút "Install" (hoặc "Cài đặt") để hoàn tất việc thêm kịch bản vào trình duyệt.

## Hướng dẫn sử dụng

1. Truy cập vào trang chủ Google (google.com hoặc google.com.vn).
2. Nhập từ khóa cần tra cứu vào ô "Nhập từ khóa...".
3. Nhập domain hoặc đường dẫn tương đối vào ô "Nhập URL / Tên miền..." (Ví dụ: github.com hoặc target.com/page).
4. Thiết lập Chế độ khớp (Chuẩn xác hoặc Tương đối) và Số trang tối đa muốn quét.
5. Ấn nút "Bắt đầu" để hệ thống tự động chạy luồng công việc.
6. Trong quá trình hệ thống đang tìm kiếm, bạn có thể nhấn "Dừng" rồi "Tiếp tục" quét, hoặc nhấn "Huỷ & Trở về trang chủ" để dừng ngay lập tức và xóa sạch dữ liệu.

> **Lưu ý quan trọng cho lần chạy đầu tiên:** Vì script sử dụng tính năng gửi yêu cầu ẩn để kiểm tra URL đích (ping), Tampermonkey sẽ hiển thị một hộp thoại bảo mật yêu cầu cấp quyền kết nối (Allow cross-origin request). Bạn hãy chọn **"Luôn cho phép" (Always allow)** hoặc **"Cho phép" (Allow)** để cấp quyền, giúp công cụ hoạt động trơn tru và không bị gián đoạn ở những lần sau.

## Quản lý State và Lưu trữ

Mặc dù Google sẽ tải lại toàn bộ trang mỗi khi chuyển sang trang kết quả tiếp theo (làm mất các biến JavaScript thông thường), Userscript này vẫn duy trì được quá trình tự động hóa nhờ hệ thống lưu trữ độc lập:
* GM_setValue: Lưu trữ trạng thái đang chạy, từ khóa, URL đích, cấu hình cài đặt và tiến độ trang hiện tại.
* GM_getValue: Tự động đọc lại các thông số ngay khi trang mới load xong để tiếp tục luồng quét mà không cần thao tác lại.