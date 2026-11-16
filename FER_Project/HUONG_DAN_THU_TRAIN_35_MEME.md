# Thu dữ liệu, train và test kho 35 meme

Một camera, một khung thu mẫu, một ô kết quả. Mỗi clip mới chứa đồng thời đặc trưng mặt/tay và pixel ảnh miệng. Không trộn dữ liệu cũ khác định dạng; dữ liệu cũ giữ nguyên. Các động tác là quy ước để gọi ảnh, không đo cảm xúc thật.

## 1. Chạy ứng dụng
Backend (khởi động lại nếu đang chạy):
```powershell
cd D:\2moncuoi\Doan\FER_Project
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```
Frontend:
```powershell
cd D:\2moncuoi\Doan\frontend
npm run dev
```
Ctrl+F5, chọn Theo động tác, mở Thu dữ liệu huấn luyện.

## 2. Thu mẫu
Giữ cùng mã người cho cùng người. Dùng mã buổi mới S07, S08, S09 cho ba lần ghi thật sự riêng biệt (nghỉ/đổi vị trí hoặc ánh sáng nhẹ). Trong mỗi buổi thu đủ các nhãn định train ở cùng điều kiện, mỗi nhãn 5 clip, mỗi clip chuẩn bị 2 giây và thu 4 giây. Thu none 10 clip/buổi, gồm nói chuyện/chuyển tư thế/nhìn quanh, không giữ đúng mẫu. Mặt thả lỏng là neutral_01, không gán mặt thả lỏng kéo dài vào none nếu đang train neutral_01. Không đòi mở mắt theo kích thước tuyệt đối; mở tự nhiên hoặc chủ động nheo/nhắm theo hướng dẫn. Hai tay phải nằm trong hình nếu nhãn dùng tay. Không che miệng. Không đưa vật dụng vào động tác.

Có thể bắt đầu 3–5 nhãn + none để kiểm tra quy trình, rồi mở rộng. Các nhãn đã train phải được giữ trong dữ liệu khi train lại. Ba buổi một người chỉ đánh giá buổi khác của người đó; để kết luận cho người khác, thu ít nhất 3 người thực và dùng --split-by subject. Không đổi mã giả để đủ nhóm.

## 3. Hướng dẫn đủ 35 nhãn
- **angry_01**: Hai nắm tay ngang hai bên vai, miệng khép, nhìn thẳng.
- **angry_02**: Hai nắm tay sát nhau trước ngực, miệng khép.
- **angry_03**: Hai nắm tay ngang hai bên vai, mở miệng lớn, không thè lưỡi.
- **angry_04**: Không đưa tay vào hình, nhíu mày rõ, mím môi, đầu thẳng.
- **angry_05**: Một nắm tay sát một bên má, tay kia ngoài hình, miệng khép.
- **fear_01**: Không đưa tay vào hình, mở miệng lớn, hai mắt chủ động mở to, không thè lưỡi.
- **fear_02**: Hai bàn tay mở đặt trước ngực, mở miệng lớn, không thè lưỡi.
- **fear_03**: Nghiêng đầu, hai bàn tay mở sát nhau ở cùng một bên má, miệng khép.
- **fear_04**: Hai bàn tay mở ở thấp dưới cằm, các ngón hướng xuống, miệng khép.
- **fear_05**: Hai nắm tay chạm nhau ngay dưới cằm, mở miệng, không thè lưỡi.
- **surprise_01**: Không đưa tay vào hình, chủ động mở to hai mắt, miệng khép.
- **surprise_02**: Một bàn tay mở cạnh má, miệng chữ O, không thè lưỡi.
- **surprise_03**: Không đưa tay vào hình, chủ động mở to hai mắt, chu môi khép.
- **surprise_04**: Không đưa tay vào hình, mở miệng chữ O, mắt mở tự nhiên, không thè lưỡi.
- **surprise_05**: Hai bàn tay mở cạnh hai má, miệng chữ O, mắt mở, không thè lưỡi.
- **happy_01**: Không đưa tay vào hình, cười khép miệng rõ, đầu thẳng.
- **happy_02**: Thè lưỡi, một bàn tay mở giơ cao hơn đỉnh đầu, tay kia ngoài hình.
- **happy_03**: Một bàn tay mở giơ cao hơn đỉnh đầu, cười hoặc mở miệng, không thè lưỡi.
- **happy_04**: Hai bàn tay mở cạnh hai má, nhắm cả hai mắt, miệng khép.
- **happy_05**: Một bàn tay mở chạm trán, tay kia ngoài hình, cười khép miệng.
- **disgust_01**: Không đưa tay vào hình, chu môi khép, chủ động nhắm cả hai mắt.
- **disgust_02**: Không đưa tay vào hình, thè lưỡi, chủ động nhắm hoặc nheo cả hai mắt.
- **disgust_03**: Không đưa tay vào hình, chủ động nhắm cả hai mắt, mở miệng, không thè lưỡi.
- **disgust_04**: Không đưa tay vào hình, thè lưỡi, mắt mở tự nhiên.
- **disgust_05**: Thè lưỡi, một bàn tay mở ở cạnh miệng nhưng không che miệng.
- **neutral_01**: Không đưa tay vào hình, miệng khép thả lỏng, mắt mở, đầu thẳng.
- **neutral_02**: Một ngón trỏ chỉ lên cạnh má, các ngón khác gập, miệng khép thả lỏng.
- **neutral_03**: Một bàn tay mở ở trước ngực, đầu nghiêng, miệng khép thả lỏng.
- **neutral_04**: Không đưa tay vào hình, miệng khép thả lỏng, chủ động nhắm cả hai mắt.
- **neutral_05**: Không đưa tay vào hình, miệng khép thả lỏng, đầu nghiêng rõ sang một bên.
- **sad_01**: Một bàn tay mở chạm thái dương, đầu nghiêng, miệng khép không cười.
- **sad_02**: Hai bàn tay mở sát hai bên miệng nhưng không che miệng, đầu thẳng, miệng khép.
- **sad_03**: Không đưa tay vào hình, hạ hai khóe môi rõ, mắt mở, đầu thẳng.
- **sad_04**: Một bàn tay mở áp má, đầu nghiêng tựa vào tay, miệng khép.
- **sad_05**: Chắp hai bàn tay trước ngực, các ngón hướng lên, đầu thẳng, miệng khép.

Các mẫu chỉ khác mắt/miệng có thể khó; kết quả kiểm tra sẽ quyết định giữ riêng hay gom nhóm. Không bảo đảm phân biệt cả 35 chỉ vì có đủ nhãn.

## 4. Kiểm tra dữ liệu và train
Trong terminal mới ở FER_Project; giữ BE/FE, không thu thêm trong lúc train.
```powershell
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by session --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by session
```
Mặc định chỉ train các nhãn đã có dữ liệu, bắt buộc none và ít nhất một động tác. Mỗi nhãn phải có trong cả tập train/validation/test tách theo nhóm. Thiếu dữ liệu sẽ dừng, không sinh mô hình giả. Có thể chọn rõ nhóm:
```powershell
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by session --labels angry_02 sad_04 disgust_04 none --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by session --labels angry_02 sad_04 disgust_04 none
```
Mỗi lần train ghi một thư mục mới trong model/meme_classifier_runs, có report.json, classifier.joblib, confusion_matrix.png và READY. Không ghi đè bản trước. Phải đọc Accuracy, Macro-F1, bảng nhầm lẫn; không mặc định coi thành công là chính xác. Mô hình nhiều lớp vẫn có thể đoán nhầm mẫu chưa được thu, cần mẫu âm đa dạng.

## 5. Test
Sau khi train xong, web dùng bản train hoàn tất mới nhất khi tải lại danh mục. Khởi động lại BE, Ctrl+F5. Danh sách ảnh tự lấy đúng nhãn mô hình đã học; không sửa available từng ảnh. Nhãn đã train dùng mô hình, động tác cũ chưa thay thế vẫn giữ bộ dự phòng; một bộ quyết định chung chọn kết quả. Dữ liệu tích lũy được giữ để train thêm nhãn mỗi ngày. Giữ động tác khoảng một giây; none hoặc điểm thấp không gọi ảnh. Không cần thêm file cho mỗi ảnh. Dữ liệu 35 ảnh không tự tạo 35 mô hình.

Với kiểm tra nghiêm túc, ghi nhận kết quả trên người/buổi mới, không dùng lại buổi test để liên tục chỉnh rồi báo điểm đó như đánh giá độc lập.
