# Thu dữ liệu và huấn luyện bộ phân loại động tác

Chưa có dữ liệu người thật thì chưa huấn luyện. 35 ảnh mèo là đích hiển thị, không phải dataset đầu vào của bộ phân loại động tác người. MediaPipe trích xuất đặc trưng; nhóm tự thu nhãn và huấn luyện Random Forest. Mô hình cảm xúc Keras giữ nguyên. Cần xác nhận giảng viên chấp nhận dùng mô hình trích xuất đặc trưng đã huấn luyện trước.

## Chạy công cụ

Terminal backend:
```powershell
cd D:\2moncuoi\Doan\FER_Project
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Terminal frontend:
```powershell
cd D:\2moncuoi\Doan\frontend
npm run dev
```

Dừng server cũ bằng Ctrl+C trước. Mở URL frontend, Theo động tác, bật camera. Dưới camera có Thu dữ liệu có nhãn. Tắt các chương trình OpenCV đang chiếm camera.

## Thu mẫu

1. Người đầu dùng P01, buổi đầu S01. Không cần tên thật. Mã người không đổi giữa các buổi. Người khác dùng P02, P03...
2. Chọn một trong bảy nhãn động tác hoặc none. Đọc hướng dẫn mẫu tương ứng. Nhãn do người thu chủ động xác định, không được dựa vào kết quả quy tắc.
3. Bấm Thu mẫu: đếm ngược 2 giây, rồi giữ động tác 4 giây. Không cần làm đến khi hệ thống nhận đúng. Thay đổi nhẹ vị trí, không biến sang động tác khác giữa clip.
4. Mỗi nhãn ít nhất 5 clip/buổi. Thả lỏng, bỏ tay xuống rồi làm lại giữa các clip. Không ghi liên tục một tư thế để tạo hàng trăm ảnh gần giống.
5. Nhãn none gồm mặt thả lỏng, nói chuyện, tay buông, động tác không nằm trong bảy mẫu và chuyển tiếp. Mặt vẫn cần xuất hiện vì feature schema dùng mặt làm mốc.
6. Mục tiêu ban đầu: 3–5 người, mỗi người 2 buổi, đủ cả 8 nhãn mỗi buổi. 5 clip × 8 nhãn = 40 clip/người/buổi. Đây là kế hoạch thu thử, không bảo đảm độ chính xác. Mở rộng theo lỗi quan sát.
7. Bấm Xem thống kê. Mỗi clip lưu tối đa khoảng 5 mẫu/giây; số khung là dữ liệu tương quan, không được báo thành số lần thử độc lập.

Chỉ lưu vector đặc trưng, nhãn, mã người/buổi, thời gian trong clip và mã phiên bản trích xuất. Không ghi ảnh/video. Đặc trưng vẫn là dữ liệu người tham gia, chỉ thu của người đã đồng ý. Tệp ở `FER_Project/gesture_data/clips/*.json`. Nếu dùng máy khác thì sao chép các JSON vào đúng thư mục này; UUID tránh đè nhau. Muốn mình kiểm tra thì gửi đường dẫn thư mục này và cho biết mã nào là cùng một người/buổi. Không cần gửi tên thật hay ảnh cá nhân.

## Kiểm tra và huấn luyện

Khi đã có ít nhất 3 người, đủ 8 nhãn ở từng người:
```powershell
cd D:\2moncuoi\Doan\FER_Project
.\.venv\Scripts\python.exe -m gesture_ml.train --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train
```

Mặc định chia theo người: người thuộc Test không xuất hiện ở Train/Validation. Thử hai mức min_samples_leaf, chọn theo Validation Macro-F1, huấn luyện lại bằng Train+Validation, đánh giá Test riêng. Báo cả chỉ số theo khung và theo clip; chỉ số theo clip phù hợp hơn để tránh thổi phồng số lần thử. Lưu danh sách clip từng tập, version/schema và hash dataset để kiểm tra.

Nếu chỉ có một người, cần ít nhất 3 buổi thật sự khác nhau, đủ 8 nhãn mỗi buổi, rồi chạy:
```powershell
.\.venv\Scripts\python.exe -m gesture_ml.train --split-by session --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train --split-by session
```

Đó chỉ là đánh giá khác buổi, không chứng minh tổng quát cho người mới. Không tự đổi mã người để vượt kiểm tra. Không chia ngẫu nhiên từng khung hình.

Kết quả thật mới tạo khi đủ dữ liệu:
```text
model/gesture_classifier_v1/
  classifier.joblib
  report.json
  confusion_matrix.png
```

Nếu thư mục kết quả đã tồn tại, lệnh từ chối ghi đè. Dùng `--out model/gesture_classifier_v2` để giữ các lần thử. API mặc định chỉ đọc v1; các bản khác cần chủ động lựa chọn sau khi đánh giá. Không dùng joblib từ nguồn không tin cậy. Ngưỡng điểm/gap runtime là tạm thời, chưa hiệu chỉnh; xác suất Random Forest không tự động là độ tin cậy đã hiệu chuẩn.

## Sau khi huấn luyện

Gửi mình `report.json`, `confusion_matrix.png` và đường dẫn dataset để kiểm tra lỗi, độ phủ nhãn và tách nhóm. API đã có endpoint model-status/predict dùng cùng schema. Giao diện chưa tự đổi từ quy tắc sang mô hình mới: cần xem kết quả rồi mới tích hợp ổn định, không âm thầm trộn hai nguồn. Lấy mốc mắt của chế độ quy tắc không thay vector học máy; cùng hàm extractGestureFeatures được dùng khi thu dữ liệu.

## Phương pháp

Random Forest học từ dữ liệu nhóm thu, không phải mô hình đã huấn luyện sẵn. Phần MediaPipe vẫn là mô hình có sẵn, phải trình bày trung thực trong báo cáo. Tài liệu: https://scikit-learn.org/stable/modules/ensemble.html#forest và https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupShuffleSplit.html


## Thu trước 35 nhãn, train từng nhóm
Danh sách thu mẫu lấy toàn bộ gesture_mapping.json, độc lập với available.
Mỗi nhãn cần động tác rõ ràng; đặc trưng điểm mặt/tay không chứa ảnh lưỡi hay tư thế toàn thân.
Nhãn mới có thể thu trước, nhưng chưa tự được dùng trong nhận diện trực tiếp.
Ví dụ chỉ train angry_02 và sad_04 cùng mẫu âm none (phải thu đủ cả ba nhãn qua ít nhất 3 nhóm):
```powershell
.\.venv\Scripts\python.exe -m gesture_ml.train --split-by session --labels angry_02 sad_04 none --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train --split-by session --labels angry_02 sad_04 none --out model/gesture_classifier_v2
```
Mỗi lần mở rộng nhãn, train lại từ dữ liệu tích lũy của tất cả nhãn muốn hỗ trợ; không chỉ train nhãn mới.
Đánh giá trước khi tích hợp vào luồng tìm meme. Không đổi mã người/buổi giả để đủ nhóm.
