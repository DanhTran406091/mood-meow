# Thử riêng meme thè lưỡi

Chưa phải mô hình nhận diện thè lưỡi đã huấn luyện. Thu hai nhãn để kiểm tra đặc trưng màu vùng miệng có đủ phân biệt không. Các điểm mặt chỉ xác định vùng cắt; không giả định MediaPipe cung cấp tongueOut. Không dùng quy tắc đỏ là lưỡi để tự gán nhãn. Môi, ánh sáng, màu da có thể gây nhầm; cần dữ liệu đối chứng.

## Trên web

Khởi động lại API và frontend như hướng dẫn cũ. Theo động tác → bật camera → kéo đến Thu thử ảnh mèo thè lưỡi — 2 nhãn riêng.

- Người: P01. Buổi đầu: T01. Mỗi người luôn giữ cùng mã người giữa các buổi.
- the_luoi: mở miệng và thè lưỡi tự nhiên, thu 5 lần.
- mo_mieng: mở miệng nhưng không thè lưỡi, thu 5 lần. Thay đổi nhẹ độ mở miệng giữa các lần, không đổi nhãn giữa một clip.
- Mỗi lần 2 giây chuẩn bị + 4 giây thu. Giữ cùng ánh sáng/góc máy cho cả hai lớp để tránh mô hình học điều kiện chụp thay vì lưỡi. Thu xen kẽ hai nhãn nếu thuận tiện.
- Thả lỏng giữa các clip. Không cần chờ meme hiện đúng; chế độ live hiện tại chưa sử dụng nhãn mới.
- Mục tiêu bước đầu: thử một người trong ba buổi khác nhau T01, T02, T03, mỗi buổi đủ hai nhãn. Không tự đổi mã buổi nếu vẫn là cùng một lần thu để vượt kiểm tra.

Lưu tại `gesture_data/tongue_pilot/clips/*.json`, hoàn toàn riêng với `gesture_data/clips` và schema 152 đặc trưng cũ. Lưu 64 thống kê màu của lưới 4x4 vùng miệng, không ghi tệp ảnh/video. Thống kê vẫn phản ánh ngoại hình vùng miệng nên chỉ thu người đã đồng ý. Không có thay đổi hay chuyển đổi dữ liệu cũ.

## Sau khi thu đủ ba buổi

```powershell
cd D:\2moncuoi\Doan\FER_Project
.\.venv\Scripts\python.exe -m gesture_ml.train_tongue --split-by session --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train_tongue --split-by session
```

Kết quả thật mới được tạo sau khi có đủ dữ liệu, tại `model/tongue_pilot_v1/classifier.joblib` và `report.json`. Chọn min_samples_leaf bằng Validation; Test là buổi riêng và đánh giá theo clip, không coi các khung trong một clip là lần thử độc lập. Kết quả một người/khác buổi không đại diện cho người mới. Với nhiều người dùng `--split-by subject` (mặc định), cần ít nhất ba người và đủ hai nhãn ở mỗi người.

Gửi đường dẫn thư mục dữ liệu hoặc report.json để kiểm tra tiếp. Chưa tự kích hoạt model cho ghép meme; chỉ tích hợp sau khi xem lỗi kiểm thử. Nếu không tách được hai lớp, cần đổi đặc trưng hoặc phương án mô hình, không trình bày đây là kết quả nhận diện thành công.
