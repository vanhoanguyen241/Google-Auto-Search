# Google-Auto-Search

Google Auto-Search là một Userscript dành cho Tampermonkey hỗ trợ tự động hóa quá trình tìm kiếm từ khóa và truy tìm xếp hạng của một địa chỉ URL tương đối trên Google Search. Công cụ được thiết kế độc lập, phù hợp để kiểm tra và giám sát các trang web trên cả hai giao diện Máy tính (PC) và Điện thoại (Mobile).

## Tính năng cốt lõi

* Giao diện nổi thông minh: Hỗ trợ floating bubble và bảng điều khiển tương thích cho cả thao tác chuột (PC) lẫn cảm ứng (Mobile). Panel tự động bám theo và tính toán tọa độ để không bị tràn khỏi viewport.
* Kiểm tra trang trước khi chạy (Pre-flight Check): Sử dụng API cấp tiện ích mở rộng `GM_xmlhttpRequest` để gửi request ẩn kiểm tra trạng thái của URL đích, bỏ qua các hạn chế về CORS. Nếu trang sập hoặc lỗi, hệ thống sẽ thông báo và dừng tiến trình ngay lập tức.
* Mô phỏng hành vi nhập liệu: Tự động focus vào ô tìm kiếm của Google và gõ từng ký tự với độ trễ ngẫu nhiên từ 50ms đến 150ms để qua mặt cơ chế phát hiện bot tại chuỗi thời gian thực.
* Giả lập cuộn chuột ngắt quãng: Khi không tìm thấy kết quả ở trang hiện tại, script thực hiện cuộn màn hình xuống từ từ theo từng nhịp bất đồng bộ trước khi chuyển trang, mô phỏng chính xác cách người dùng đọc nội dung.
* Tự động quét và chuyển trang: Tự động bấm nút "Tiếp" trên PC hoặc "Xem thêm" trên Mobile để duyệt tối đa 10 trang kết quả.
* Điều hướng và Highlight: Khi phát hiện ra URL đích, hệ thống tự động cuộn phần tử vào giữa màn hình, highlight rực rỡ bằng CSS, tạm dừng từ 1.5 đến 3 giây để giả lập thao tác đọc tiêu đề rồi tự động click vào trang đích.
* Tự động dọn dẹp trạng thái (State Cleanup): Nếu duyệt hết 10 trang hoặc hết kết quả mà không thấy trang đích, script tự động xóa toàn bộ bộ nhớ tạm, xóa trắng form nhập liệu và quay trở về trang chủ Google ban đầu để tránh để lại trạng thái treo.

## Yêu cầu hệ thống

* Trình duyệt hỗ trợ extension (Chrome, Edge, Brave, Kiwi Browser, Lemur Browser).
* Extension quản lý userscript: Tampermonkey.

## Hướng dẫn cài đặt

1. Mở bảng điều khiển của Tampermonkey trên trình duyệt.
2. Chọn Tab "Tạo tập lệnh mới" (Create a new script).
3. Sao chép toàn bộ mã nguồn userscript vào trình chỉnh sửa.
4. Ấn `Ctrl + S` hoặc File > Save để hoàn tất.

## Hướng dẫn sử dụng

1. Truy cập vào trang chủ Google (google.com hoặc google.com.vn).
2. Nhập từ khóa cần tra cứu vào ô "Nhập từ khóa...".
3. Nhập domain hoặc đường dẫn tương đối vào ô "Nhập URL đích" (Ví dụ: `github.com` hoặc `target.com/page`).
4. Ấn nút "Bắt đầu tìm".
5. Hệ thống sẽ tự động thực hiện toàn bộ luồng công việc. Người dùng có thể chủ động ấn nút "Thu nhỏ / Hủy" bất cứ lúc nào để dừng luồng hoạt động.

## Quản lý State và Lưu trữ

Mặc dù Google sẽ tải lại toàn bộ trang mỗi khi chuyển sang trang kết quả tiếp theo (làm mất các biến JavaScript thông thường), Userscript này vẫn duy trì được quá trình tự động hóa nhờ hệ thống lưu trữ độc lập:
* `GM_setValue`: Lưu trữ trạng thái đang chạy, từ khóa, URL đích và tiến độ trang hiện tại.
* `GM_getValue`: Tự động đọc lại các thông số ngay khi trang mới load xong để tiếp tục luồng quét mà không cần thao tác lại.