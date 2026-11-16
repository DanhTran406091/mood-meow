> **Chạy bản web hiện tại:** xem [README đầy đủ ở gốc repo](../README.md), gồm cài công cụ, requirements, frontend, hai terminal, hai chế độ, thu dữ liệu và train/test. Phần bên dưới là tài liệu backend/demo trước đây; đường dẫn máy tác giả và một số model so sánh có thể không có trên máy clone mới.

# Hướng dẫn chạy hệ thống nhận diện cảm xúc

## Chế độ kiểm tra webcam và kết quả chưa chắc chắn

### Phát hiện mặt khi ngước hoặc nghiêng

Ứng dụng hiện tự chọn YuNet khi có `model/face_detection_yunet_2023mar.onnx`.
Mô hình lấy từ OpenCV Zoo:
https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
Tệp tải: https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

YuNet thay bước phát hiện bounding box, không thay trọng số phân loại cảm xúc.
Ngưỡng phát hiện mặt là 0.8, độc lập với ngưỡng điểm cảm xúc. Ảnh phát hiện được
giảm xuống tối đa 640 pixel ở cạnh dài để hạn chế chi phí CPU; tọa độ được đổi
về ảnh gốc trước khi cắt. Không dùng lại khung mặt cũ nếu bộ phát hiện không
tìm thấy mặt. Góc quá lớn, che khuất hoặc thiếu sáng vẫn có thể làm mất dấu.

Để đối chiếu với phiên bản Haar đã dùng trong thực nghiệm ban đầu, thêm
`--face-detector haar` vào lệnh meme_demo.py. Để yêu cầu YuNet và báo lỗi rõ khi
thiếu tệp, thêm `--face-detector yunet`. Chế độ `auto` quay về Haar khi không có
tệp YuNet. Thay bộ phát hiện làm thay đổi vùng cắt nên cần đánh giá lại webcam;
không coi các kết quả cũ của báo cáo là kết quả kiểm thử phiên bản YuNet.

Trong VS Code, chọn interpreter `.venv/Scripts/python.exe`, mở Run and Debug và
chọn `FER - Kiem tra va meme (improved)`, sau đó nhấn F5. Hoặc chạy:

```powershell
.\.venv\Scripts\python.exe meme_demo.py --model emotion_model_96_improved.keras --smooth 10 --low-conf 0.55 --min-gap 0.15 --diagnostics
```

Đây là cấu hình thử nghiệm, chưa phải ngưỡng đã được tối ưu trên tập validation.
Điều kiện chấp nhận gồm điểm lớp cao nhất đạt 55%, cách lớp thứ hai ít nhất
15 điểm phần trăm và nhãn ổn định qua 3 lần dự đoán liên tiếp. Các lần dự đoán
đã được làm mượt nên không phải các bằng chứng độc lập. Điểm cao vẫn có thể sai.
Không đạt điều kiện thì ứng dụng hiện trạng thái chờ/chưa chắc chắn, không ép
thành neutral và không giữ meme cũ làm người xem nhầm với kết quả hiện tại.

Ba cửa sổ được đặt cạnh nhau: 1 là camera đầy đủ có khung nhận diện mặt,
2 là meme và 3 là biểu đồ điểm sau làm mượt của 7 lớp cùng trạng thái ngưỡng.
Biểu đồ giữ thứ tự nhãn cố định để dễ theo dõi. Có thể kéo và đổi kích thước
các cửa sổ khi cần. Nhấn `e` trong
một cửa sổ ứng dụng để bật/tắt cân bằng sáng vùng mặt; lịch sử dự đoán được xóa
khi chuyển để không trộn hai cách tiền xử lý. Không mặc định bật cân bằng sáng
vì chưa có đối chứng xác nhận hiệu quả. Không lưu ảnh/video.

Nhấn `n` để đổi meme khi đã có kết quả ổn định, `q` để thoát. Cấu hình này dùng
96_improved để tiếp tục kiểm tra webcam, không thay mô hình chính 96_both của
báo cáo. Có thể đổi tên model trong lệnh để thử các phiên bản khác. Trọng số mô
hình không bị sửa. Các chế độ cũ vẫn giữ các tham số riêng của chúng.

Tài liệu này hướng dẫn chuẩn bị thư mục, chạy thử một model, kiểm tra bằng ảnh tĩnh và so sánh nhiều model bằng webcam trên Windows.

## 1. Cấu trúc thư mục

Sắp xếp các file theo cấu trúc sau:

```text
Emotion_Project/
│
├── emotion.py
├── webcam_demo.py
├── compare_live.py
│
└── model/
    ├── emotion_model_96.keras
    ├── emotion_model_96.json
    ├── emotion_model_96_improved.keras
    ├── emotion_model_96_improved.json
    ├── emotion_model_96_both.keras
    ├── emotion_model_96_both.json
    ├── emotion_model_7class_old.keras
    └── emotion_model_7class_old.json
```

**Lưu ý:**
- Mỗi model cần có hai file cùng tên: `.keras` và `.json`.
- Các model dùng để ensemble phải có cùng thứ tự nhãn và cùng cách chuẩn bị/cắt ảnh khuôn mặt.
- `emotion.py`, `webcam_demo.py` và `compare_live.py` nằm ngoài thư mục `model/`.
- Thay tên model trong ví dụ bằng tên file thực tế đang có trong thư mục `model/`.

## 2. Chuẩn bị môi trường Python

Mở Terminal tại thư mục `Emotion_Project`, sau đó cài các thư viện nếu máy chưa có:

```bash
pip install tensorflow opencv-python numpy
```

Kiểm tra Python:

```bash
python --version
```

Kiểm tra TensorFlow:

```bash
python -c "import tensorflow as tf; print(tf.__version__)"
```

Nếu máy có nhiều phiên bản Python, hãy đảm bảo lệnh `python` đang trỏ đến môi trường đã cài TensorFlow và OpenCV.

## 3. Chạy thử một model bằng webcam

Chạy model mặc định:

```bash
python webcam_demo.py
```

Chọn một model cụ thể:

```bash
python webcam_demo.py --model emotion_model_96.keras
```

Ví dụ chạy model mới:

```bash
python webcam_demo.py --model emotion_model_96_both.keras
```

Các tùy chọn:

| Tham số | Ý nghĩa |
|---|---|
| `--camera 1` | Chọn webcam số 1 thay vì webcam số 0 |
| `--scan` | Dò tìm webcam đang hoạt động |
| `--model ten_model.keras` | Chọn model trong thư mục `model/` |
| `--smooth 3` | Làm mượt ít frame hơn, phản hồi nhanh hơn |
| `--smooth 10` | Làm mượt qua 10 frame gần nhất (mặc định) |
| `--low-conf 0.5` | Hiện trạng thái chưa đủ tin cậy nếu confidence dưới 50% |
| `--blur 1.0` | Làm mờ Gaussian ảnh khuôn mặt trước khi dự đoán |
| `--no-equalize` | Tắt cân bằng sáng vùng mặt |
| `--equalize` | Bật cân bằng sáng vùng mặt |
| `--image anh.jpg` | Kiểm tra bằng một ảnh tĩnh thay vì webcam |

Ví dụ:

```bash
python webcam_demo.py --model emotion_model_96_both.keras --smooth 3 --low-conf 0.5
```

Nhấn `q` để thoát cửa sổ webcam.

## 4. Kiểm tra bằng ảnh tĩnh

Có thể kiểm tra model trên cùng một ảnh mà không cần mở webcam:

```bash
python webcam_demo.py --model emotion_model_96_both.keras --image test.jpg
```

Kết quả hiển thị:
- Cảm xúc được dự đoán.
- Confidence của lớp đứng đầu.
- Xác suất của từng lớp.
- Khung khuôn mặt được phát hiện.

Dùng cùng một ảnh để so sánh các model giúp loại bỏ khác biệt do biểu cảm hoặc chuyển động giữa các lần chụp.

## 5. So sánh nhiều model trực tiếp bằng webcam

`compare_live.py` cho phép nhiều detector nhận diện trên cùng một khung hình webcam và hiển thị kết quả song song.

### 5.1. So sánh hai model riêng biệt

```bash
python compare_live.py --models emotion_model_96.keras emotion_model_96_improved.keras
```

### 5.2. So sánh model mới với ensemble cũ

```bash
python compare_live.py --models emotion_model_96_both.keras emotion_model_7class_old.keras+emotion_model_96_improved.keras
```

Dấu `+` dùng để ghép nhiều model thành một detector; các xác suất đầu ra được lấy trung bình.

### 5.3. So sánh cùng một model với các mức làm mờ khác nhau

```bash
python compare_live.py --models emotion_model_96_both.keras emotion_model_96_both.keras@1.0 emotion_model_96_both.keras@1.5
```

Ý nghĩa:
- Không có `@`: dùng ảnh khuôn mặt sau tiền xử lý thông thường.
- `@1.0`: áp dụng Gaussian blur với sigma 1.0.
- `@1.5`: áp dụng Gaussian blur với sigma 1.5.

### 5.4. Điều chỉnh độ mượt và ngưỡng confidence

```bash
python compare_live.py --models emotion_model_96.keras emotion_model_96_both.keras --smooth 3 --low-conf 0.5
```

| Tham số | Ý nghĩa |
|---|---|
| `--smooth 0` | Tắt làm mượt, xem dự đoán tức thời |
| `--smooth 3` | Làm mượt bằng 3 frame gần nhất |
| `--smooth 10` | Làm mượt bằng 10 frame gần nhất |
| `--low-conf 0.4` | Đánh dấu `(?)` nếu confidence dưới 40% |
| `--low-conf 0.5` | Đánh dấu `(?)` nếu confidence dưới 50% |

Nhấn `q` để thoát.

## 6. Cách đọc kết quả

Trên màn hình so sánh, mỗi dòng thể hiện một model hoặc một detector ensemble:
- Tên model/detector.
- `(?)` nếu confidence thấp hơn ngưỡng `--low-conf`.
- Lớp dự đoán có xác suất cao nhất.
- Lớp có xác suất cao thứ hai.

Ví dụ minh họa:

```text
96_original: happy 82% / sad 10%
96_improved: sad 48% / happy 35%
96_both_v2: happy 76% / neutral 12%
```

Các con số trên chỉ là ví dụ, không phải kết quả thực tế.

Khi đánh giá, nên quan sát:
1. **Độ chính xác:** dự đoán có khớp với biểu cảm đang thể hiện không?
2. **Confidence:** xác suất lớp đứng đầu cao hay thấp?
3. **Độ ổn định:** dự đoán có thay đổi liên tục giữa các frame không?
4. **Khả năng phân biệt:** xác suất lớp đứng đầu có cách biệt rõ với lớp đứng thứ hai không?

Confidence là xác suất do model xuất ra, không phải cam kết rằng dự đoán đúng. Không nên chọn model chỉ dựa vào confidence cao nhất.

## 7. Quy trình thử nghiệm đề xuất

Để so sánh công bằng, giữ nguyên webcam, khoảng cách, ánh sáng, biểu cảm và tham số `--smooth` trong các lần thử.

| Lần thử | Cấu hình | Mục đích |
|---|---|---|
| 1 | Model 96 gốc | Mốc so sánh ảnh nét |
| 2 | Model 96 improved | Kiểm tra model học ảnh giảm chất lượng |
| 3 | Model 96 both v2 | Kiểm tra model học cả ảnh nét và ảnh mờ |
| 4 | Model 96 gốc + improved | So sánh với ensemble hai model |
| 5 | Model 96 both v2 với `@1.0` | Kiểm tra tác động của làm mờ lúc inference |

Có thể ghi kết quả theo bảng:

| Biểu cảm thực tế | 96 gốc | Improved | Both v2 | Ensemble |
|---|---|---|---|---|
| Angry | | | | |
| Disgust | | | | |
| Fear | | | | |
| Happy | | | | |
| Neutral | | | | |
| Sad | | | | |
| Surprise | | | | |

Nên thử mỗi biểu cảm nhiều lần và ghi nhận cả trường hợp dự đoán sai, thay vì chỉ chọn những lần model dự đoán đúng.

## 8. Một số lưu ý kỹ thuật

- `--blur` chỉ làm mờ ảnh đầu vào tại thời điểm dự đoán; không thay đổi trọng số model.
- `--smooth` lấy trung bình xác suất qua các frame gần nhất. Giá trị lớn thường làm kết quả ổn định hơn nhưng phản hồi chậm hơn.
- Trong `compare_live.py`, mỗi detector có lịch sử làm mượt riêng. Nên dùng cùng một giá trị `--smooth` cho tất cả detector.
- Khi ensemble, các model phải có cùng thứ tự nhãn và cùng cách cắt khuôn mặt. `emotion.py` sẽ kiểm tra thứ tự nhãn và margin trong file JSON.
- Nếu model không nằm trong `model/` hoặc thư mục chứa `emotion.py`, hãy truyền đường dẫn hợp lệ đến file model.
- Nếu webcam không mở được, thử `python webcam_demo.py --scan`, đóng các ứng dụng đang sử dụng webcam hoặc thử `--camera 1`.

## 9. Lệnh chạy nhanh được đề xuất

So sánh đồng thời model 96 gốc, model improved, model both v2 và ensemble:

```bash
python compare_live.py --models emotion_model_96.keras emotion_model_96_improved.keras emotion_model_96_both.keras emotion_model_7class_old.keras+emotion_model_96_improved.keras --smooth 3 --low-conf 0.4
```

Thay các tên file trong lệnh bằng đúng tên model đang có trong thư mục `model/`.
