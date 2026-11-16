# Mood & Meow

Ứng dụng webcam nhận diện cảm xúc và tìm meme theo động tác mặt/tay. React + TypeScript + Vite ở frontend; Python + FastAPI ở backend. MediaPipe trích điểm mặt/tay; nhóm thu dữ liệu và tự huấn luyện bộ phân loại động tác.

## Cấu trúc
- `FER_Project/`: API, model cảm xúc mặc định, thu dữ liệu và lệnh train.
- `frontend/`: giao diện, camera và MediaPipe chạy trong trình duyệt.
- `meme_samples_35/`: 35 ảnh chọn, mapping và hướng dẫn động tác.

Repo công khai không chứa clip đã thu, pixel vùng miệng, môi trường Python, node_modules, kết quả train cá nhân hoặc các model thử nghiệm cũ. Chỉ kèm model cảm xúc mặc định và model MediaPipe/YuNet cần để chạy. Meme là tài nguyên bên thứ ba phục vụ demo; không coi repo này là cấp phép lại ảnh.

## Cài lần đầu trên Windows
Cần Git, Python **3.11**, Node.js **22.12 trở lên** và Chrome/Edge có webcam. Mở terminal ở nơi muốn lưu dự án:

```powershell
git clone https://github.com/DanhTran406091/mood-meow.git
cd mood-meow
py -3.11 -m venv FER_Project/.venv
.\FER_Project\.venv\Scripts\python.exe -m pip install -r FER_Project/requirements.txt
cd frontend
npm ci
```

Không copy `.venv` từ máy người khác. Không cần kích hoạt môi trường nếu dùng đúng đường dẫn python như dưới đây.

## Chạy ứng dụng: hai terminal
Terminal 1, từ thư mục gốc repo:

```powershell
cd FER_Project
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Terminal 2, từ thư mục gốc repo:

```powershell
cd frontend
npm run dev
```

Mở địa chỉ Local Vite in ra, cho phép camera. Không chạy đồng thời OpenCV demo hoặc ứng dụng khác giữ webcam. Nếu port 8000 bận, dừng BE cũ bằng Ctrl+C rồi chạy lại. API ở localhost, không mở máy chủ công khai để thu dữ liệu.

## Các thành viên thu mẫu
1. Vào **Theo động tác → Thu dữ liệu huấn luyện**, bật camera.
2. Chốt mã người: P01 cho Danh, các thành viên khác dùng P02/P03/P04. Cùng người luôn giữ cùng mã; không tạo mã giả để đủ người.
3. Dùng mã buổi riêng (S01, S02, S03…) khi thực sự sang lần ghi khác. Thu cùng bộ nhãn ở mỗi buổi.
4. Chọn đúng nhãn và làm đúng hướng dẫn cạnh ảnh; giữ động tác suốt 4 giây sau đếm ngược. Mỗi nhãn 5 lần/buổi. Thu thêm `none` (nói chuyện/chuyển tư thế/nhìn quanh, tránh giữ đúng mẫu).
5. Mỗi lần thu lưu điểm mặt/tay và pixel ảnh miệng trên máy người thu, có thể khôi phục ảnh miệng. Chỉ thu khi người thực hiện đồng ý. Không gửi các tệp này bằng commit, issue, PR hoặc link tải công khai.

Hướng dẫn chi tiết đủ 35 nhãn: [HUONG_DAN_THU_TRAIN_35_MEME.md](FER_Project/HUONG_DAN_THU_TRAIN_35_MEME.md).

## Gửi mẫu về người tổng hợp
Dữ liệu nằm tại `FER_Project/gesture_data/meme_training/clips/*.json`, đã bị Git bỏ qua. Sau khi thu xong, chạy từ thư mục gốc repo:

```powershell
New-Item -ItemType Directory -Force data_exports
Compress-Archive -Path .\FER_Project\gesture_data\meme_training\clips\*.json -DestinationPath .\data_exports\P02_S01.zip
```

Đổi tên ZIP theo đúng mã người/buổi, dùng tên mới cho lần xuất tiếp theo. Lệnh đóng gói tất cả clip hiện có trên máy; tên ZIP chỉ là nhãn gói, không thay đổi nhãn bên trong. Gửi riêng cho người tổng hợp qua kênh nhóm đã thống nhất, sau khi đồng ý chia sẻ dữ liệu vùng miệng. Các JSON dùng UUID để tránh trùng tên. Người tổng hợp giải nén vào cùng thư mục clips, không sửa nhãn hay ghi đè tệp UUID đã có nội dung khác.

## Train sau khi tổng hợp
Từ `FER_Project`, kiểm tra theo người khi có ít nhất 3 người thực và đủ nhãn mỗi nhóm:

```powershell
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by subject --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by subject
```

Nếu chỉ thử trên một người với ít nhất 3 buổi thực thì đổi `subject` thành `session`; kết quả đó không đánh giá khả năng trên người mới. Có thể dùng `--labels angry_02 sad_04 disgust_04 none` để thử một nhóm nhãn. Mỗi lần mở rộng, train lại với dữ liệu của tất cả nhãn muốn dùng.

Xem Accuracy/Macro-F1 và bảng nhầm lẫn trước khi kết luận. Kết quả nằm trong `model/meme_classifier_runs/` và không được commit. Khởi động lại BE, tải lại web để test bản train hoàn tất mới nhất. Vẫn chỉ có một camera và một ô meme trong chế độ động tác. Chưa có dữ liệu train chung thì app dùng các động tác dự phòng đã hỗ trợ; repo không chứa bản train thè lưỡi cá nhân.

## Cập nhật code
Trước khi làm việc, chạy `git pull` ở gốc repo. Dữ liệu thu và môi trường cài đặt không bị thay đổi bởi thao tác cập nhật code thông thường. Thành viên chỉ thu mẫu không cần quyền push; nếu sửa code, chủ repo mời vào Collaborators hoặc dùng Pull Request.
