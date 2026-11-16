# Mood & Meow

React + TypeScript + Vite. Giao diện sáng, camera sạch không khung mặt, câu mô tả biểu cảm tiếng Việt, meme có ghim/tải ảnh và 12 ảnh gần đây.

## Chạy trong VS Code

Mở cả thư mục `D:\2moncuoi\Doan`. Cần hai terminal.

Terminal Python:
```powershell
cd D:\2moncuoi\Doan\FER_Project
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Terminal frontend:
```powershell
cd D:\2moncuoi\Doan\frontend
npm run dev
```

Terminal demo OpenCV (tùy chọn, mở ba cửa sổ camera, meme và xác suất):
```powershell
cd D:\2moncuoi\Doan\FER_Project
.\.venv\Scripts\python.exe meme_demo.py --model emotion_model_96_both.keras --smooth 10 --low-conf 0.55 --min-gap 0.15 --diagnostics
```

Demo chạy độc lập, không cần API hoặc frontend. Bấm Dừng camera trên web trước khi chạy demo; không dùng hai chế độ camera cùng lúc. Nhấn `q`, `Esc` hoặc đóng cửa sổ để thoát demo.

Mở URL Local Vite hiển thị. Đợi Python báo `Application startup complete` rồi bấm Bật camera. Đóng demo OpenCV trước để camera không bị chiếm.

Backend nạp mô hình theo `DEFAULT_MODEL` trong `emotion.py` (hiện là `96_both`) và tự chọn YuNet nếu có. Đây là cấu hình thử nghiệm, không thay trọng số. Làm mượt 5 lần dự đoán, chấp nhận điểm >=0.55 và gap >=0.15, nhãn lặp 3 lần. Các ngưỡng chưa tối ưu trên validation. WebSocket gửi từng JPEG tối đa 640×480; chờ kết quả trước khi gửi ảnh tiếp. Lịch sử riêng từng kết nối, bộ nhớ/tính toán mô hình được bảo vệ bằng khóa chung. Chỉ chạy một worker; mô hình chạy trên máy của bạn.

Ghim ảnh giữ nguyên meme dù biểu cảm đổi; bấm Bỏ ghim để trở về tự động. Đổi meme cùng cảm xúc cũng ghim ảnh mới. Bấm Tải ảnh sẽ ghim và tải đúng ảnh tại thời điểm bấm. Danh sách gần đây chỉ giữ trong phiên trang, không phải lưu lâu dài. Dừng camera vẫn giữ meme đã ghim. Ảnh camera không được ghi thành tệp. Không hiển thị dữ liệu nhận diện giả khi chưa có backend.

API: GET /api/health, WS /api/recognize (JPEG binary → JSON), GET /api/suggestions/{label}?exclude={id}, GET /api/memes/{id}/file?download=true. Vite proxy /api sang localhost:8000. Chưa triển khai đăng nhập, database hay hosting.

Kiểm tra: `npm run build`, `npm run lint`.


## Chế độ Theo động tác — thử nghiệm

Giữ nguyên Theo cảm xúc và các mô hình Keras của nhóm. Chế độ mới dùng MediaPipe Face Landmarker + Hand Landmarker trong Web Worker, CPU, tài nguyên WASM/model được phục vụ cục bộ trong public/. Không gửi ảnh camera cho API trong chế độ động tác. API chỉ cung cấp danh sách mẫu và ảnh từ ../meme_samples_35. Không huấn luyện lại mô hình cảm xúc và không dùng điểm người để tự gán đặc trưng cho ảnh mèo.

Chọn tab Theo động tác, chọn một ảnh để đọc hướng dẫn, rồi bắt đầu camera. Việc chọn ảnh không ép bộ nhận diện trả mẫu đó: bộ quy tắc vẫn kiểm tra 7 mẫu. Giữ tư thế ít nhất 0,7 giây và 4 lần xử lý; thiếu mặt/tay, không khớp hoặc khớp nhiều mẫu thì chưa đề xuất. Ghim và tải ảnh hoạt động riêng với lịch sử cảm xúc. Mỗi lần chuyển chế độ sẽ dừng camera cũ.

Các mẫu thử: angry_02 hai nắm tay trước ngực; angry_05 một nắm tay gần má; surprise_04 mắt/miệng mở, không tay; happy_03 giơ một tay mở và miệng mở/cười; happy_04 hai tay mở bên mặt và nhắm mắt; sad_04 tay mở gần má và nghiêng đầu; sad_05 chắp hai tay trước ngực. Vị trí trước ngực chỉ được xấp xỉ bằng vị trí tay so với mặt; chưa có Pose Landmarker. Các ngưỡng hình học là giả thuyết triển khai ban đầu, chưa được hiệu chỉnh/đánh giá bằng người thực. Điểm blendshape không phải xác suất của 7 cảm xúc.

Mẫu trong gesture_mapping.json vẫn ghi enabled=false và chưa xác thực. Chế độ thử dùng pilot_candidate=true qua endpoint riêng, không kích hoạt toàn bộ 35 mẫu. Cần thử nhiều người, theo dõi trường hợp thiếu tay/che khuất và nhầm giữa mẫu trước khi báo cáo hiệu quả. Không có cam kết phân biệt mọi động tác, nước mắt hoặc lưỡi; không có nhận diện đạo cụ hay tìm kiếm ảnh tự do.

Tài nguyên: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker và https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker. Models: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task và https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task. Tệp wasm phải khớp phiên bản @mediapipe/tasks-vision trong package-lock.json.

Kiểm tra quy tắc: `npm run test:gestures`. Trang `/tests/worker-smoke.html` khi chạy Vite kiểm tra tải hai mô hình thật và ảnh trống; không yêu cầu camera. Kiểm thử điểm mô phỏng không thay thế đánh giá trên người thật.

Chế độ động tác mặc định hiện đường viền mắt/miệng/mặt và khung xương hai bàn tay. Có thể tắt bằng ô Hiện điểm và đường mặt / tay. Overlay dùng cùng phép lật gương và cắt giữa như video; mất điểm hoặc dừng camera thì xóa đường, không vẽ lại dữ liệu cũ. Đây chỉ là phản hồi theo dõi, không thay bộ phân loại/quy tắc và không tự tăng độ chính xác. Chế độ cảm xúc giữ camera sạch.

Mẫu surprise_04 không còn dùng ngưỡng eyeWide tuyệt đối: mở miệng chữ O, không cần trợn mắt. Có nút Lấy mốc mắt tự nhiên để đo tỷ lệ mở mắt riêng (10 mẫu hợp lệ, ít nhất 1,5 giây, trung vị, không lưu ảnh). Chỉ lưu trong Worker của phiên camera; dừng/chạy lại hoặc đổi người cần lấy lại mốc. Khi có mốc, kiểm tra mắt chưa khép đáng kể so với mốc; khi chưa có mốc chỉ loại mắt nhắm rõ. Giảm yêu cầu mắt có thể tăng nhầm với ngáp; đây vẫn là quy tắc thử nghiệm, chưa huấn luyện bộ phân loại.

## Thu mẫu và tự huấn luyện

Đã có bảng Thu dữ liệu có nhãn trong chế độ động tác. Xem `../FER_Project/HUONG_DAN_TRAIN_CU_CHI.md` để thu 8 lớp, kiểm tra dữ liệu và huấn luyện Random Forest bằng backend Python. Chưa có dữ liệu thì không tạo mô hình.
