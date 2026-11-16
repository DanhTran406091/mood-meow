# Mood & Meow — Hướng dẫn chạy đầy đủ đồ án

Website có cả **Theo cảm xúc** (model cảm xúc nhóm đã train) và **Theo động tác** (mặt/tay + bộ phân loại tự train). Chuyển bằng hai nút trên cùng trang; mỗi chế độ dùng một camera và một ô kết quả meme.

Hướng dẫn dành cho **Windows 64-bit + PowerShell**, từ máy chưa cài thư viện. Người xem demo/thu mẫu làm bước 1–7; người tổng hợp làm tiếp bước 8–10.

## 1. Cài công cụ trước

| Công cụ | Cách cài |
|---|---|
| Git | [Git for Windows](https://git-scm.com/install/win), dùng lựa chọn mặc định |
| Python | **3.11, 64-bit**. Có thể dùng [Python 3.11.9](https://www.python.org/downloads/release/python-3119/), mục Files → Windows installer (64-bit). Bật Python launcher và Add python.exe to PATH khi cài. Không tự đổi sang Python 3.14. |
| Node.js + npm | Chọn nhánh **Node 22, bản từ 22.12 trở lên**, Windows Installer .msi tại [Node.js](https://nodejs.org/en/download). npm đi kèm, không cài riêng. Xem [yêu cầu của Vite](https://vite.dev/guide/). |
| Trình duyệt | Chrome hoặc Edge, có webcam |
| VS Code | Tùy chọn; PowerShell thông thường vẫn chạy được |

Đóng rồi mở lại terminal/VS Code sau khi cài. Kiểm tra:

~~~powershell
git --version
py -3.11 --version
node --version
npm.cmd --version
~~~

Phải hiện phiên bản cho cả bốn lệnh. Tài liệu dùng npm.cmd để tránh PowerShell chặn npm.ps1; vẫn là npm thông thường. Không cần CUDA/GPU để chạy demo CPU.

## 2. Clone mã nguồn

Mở PowerShell:

~~~powershell
$projectParent = Join-Path $env:USERPROFILE 'Projects'
New-Item -ItemType Directory -Force -Path $projectParent
Set-Location $projectParent
git clone https://github.com/DanhTran406091/mood-meow.git
cd mood-meow
~~~

Gốc repo nằm ở %USERPROFILE%\Projects\mood-meow. Nếu clone chỗ khác, thay đường dẫn các bước dưới bằng thư mục đó.

~~~text
mood-meow/
├── FER_Project/        # Python API, model cảm xúc, thu dữ liệu và train
├── frontend/           # React, TypeScript, Vite, camera và MediaPipe
├── meme_samples_35/    # 35 ảnh chọn + mapping và hướng dẫn
└── README.md
~~~

Repo công khai nên tải code không cần được cấp quyền push. Không tạo repo con riêng ở frontend/backend.

## 3. Cài thư viện backend — làm lần đầu

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow"
py -3.11 -m venv FER_Project\.venv
.\FER_Project\.venv\Scripts\python.exe -m pip install --upgrade pip
.\FER_Project\.venv\Scripts\python.exe -m pip install -r .\FER_Project\requirements.txt
~~~

Chờ cài xong; TensorFlow có thể tải lâu. Nếu có lỗi khiến lệnh dừng thì xử lý trước khi tiếp tục. Kiểm tra:

~~~powershell
.\FER_Project\.venv\Scripts\python.exe -c "import tensorflow, cv2, numpy, sklearn, matplotlib, fastapi, uvicorn; print('Backend dependencies OK')"
~~~

Không copy .venv/venv từ máy người khác. Không cần kích hoạt môi trường vì hướng dẫn gọi thẳng Python trong .venv. MediaPipe ở frontend đã kèm model/WASM; không cần pip install mediapipe cho luồng web này.

## 4. Cài thư viện frontend — làm lần đầu

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow\frontend"
npm.cmd ci
~~~

Chờ cài hoàn tất. Không chép node_modules giữa các máy. Các lần mở web sau không cần cài lại trừ khi cập nhật thư viện.

## 5. Chạy đồ án — hai terminal song song

Nếu dùng VS Code, chọn Terminal → New Terminal để mở terminal thứ hai. Không đóng terminal sau khi server khởi động.

### Terminal 1: backend

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow\FER_Project"
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
~~~

Chờ Application startup complete và Uvicorn chạy ở http://127.0.0.1:8000. Dòng thông tin oneDNN/CPU của TensorFlow không tự có nghĩa là lỗi; xem ERROR/traceback nếu chương trình dừng.

Mở http://127.0.0.1:8000/api/health để kiểm tra API; /docs là tài liệu API. **Port 8000 không phải giao diện chính.**

### Terminal 2: frontend

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow\frontend"
npm.cmd run dev
~~~

Mở **đúng địa chỉ Local Vite in trong terminal**, thường là http://localhost:5173. Port có thể đổi khi đã bị dùng. Frontend chuyển tiếp /api đến backend ở 127.0.0.1:8000.

Cho phép camera khi trình duyệt hỏi. Không mở đồng thời demo OpenCV, tab webcam khác, Zoom hoặc ứng dụng giữ webcam. Không cần mở port ra Internet.

## 6. Dùng cả hai chế độ

### Theo cảm xúc

1. Chọn Theo cảm xúc và bắt đầu camera.
2. Model nhóm đã train emotion_model_96_both.keras có sẵn trong repo, không phải train lại mới xem được.
3. Giao diện hiện câu mô tả kết quả và meme từ nhóm cảm xúc tương ứng.
4. Ghim meme để giữ ảnh hoặc Tải ảnh để tải; có danh sách ảnh gần đây.

Kết quả có thể nhầm khi ánh sáng/góc mặt khác dữ liệu train. Đây là phân loại biểu cảm hiển thị, không xác định chắc chắn cảm xúc bên trong người dùng.

### Theo động tác

1. Dừng camera chế độ trước, chuyển Theo động tác và bắt đầu camera.
2. Chọn ảnh trong danh sách để xem hướng dẫn; chọn ảnh không ép hệ thống dự đoán nhãn đó.
3. Đưa mặt/tay cần dùng vào hình, làm động tác, giữ khoảng một giây. Chỉ khi đủ rõ và ổn định mới gọi meme.
4. Có thể bật/tắt đường điểm mặt/tay. Ghim/tải ảnh dùng cùng ô kết quả.

**Khi mới clone:** có luật dự phòng cho 7 động tác cũ. Danh mục còn có ảnh thè lưỡi nhưng model thè lưỡi cá nhân không được đưa lên repo công khai. Vì vậy chưa kỳ vọng máy mới nhận đủ 35 ảnh hoặc thè lưỡi ngay. Sau khi train bộ chung, dùng các nhãn model đã học.

Ảnh mèo là đầu ra gắn với nhãn, không thay thế dữ liệu người làm động tác. Tên angry_02/sad_04 là mã meme/động tác, không chứng minh người đó đang giận/buồn.

## 7. Thu mẫu cho nhóm

Mở **Theo động tác → Thu dữ liệu huấn luyện · dành cho nhóm phát triển**. Một lần thu lưu chung **152 đặc trưng mặt/tay + 4.608 giá trị pixel RGB vùng miệng**, tổng 4.760 số/khung. Không chọn riêng bộ mắt/tay/lưỡi.

### Mã người và buổi

| Thành viên | Mã người |
|---|---|
| Danh | P01 |
| Thành viên thứ 2 | P02 |
| Thành viên thứ 3 | P03 |
| Thành viên thứ 4 | P04 |

Giữ đúng mã cho cùng người. Dùng S01/S02/S03… cho các lần ghi thực sự riêng biệt. P01 có thể tiếp tục S07/S08/S09 để khác các lần thử cũ. Không đổi mã giả để đủ nhóm.

### Thao tác thu

1. Nhóm chốt cùng bộ nhãn sẽ thu. Có thể thử vài nhãn + none trước, không bắt buộc đủ 35 ngay.
2. Điền mã người/buổi, chọn nhãn và đọc hướng dẫn cạnh ảnh. [Hướng dẫn đủ 35 nhãn](FER_Project/HUONG_DAN_THU_TRAIN_35_MEME.md).
3. Bật camera, kiểm tra thấy mặt/miệng và bàn tay cần dùng. Không che miệng.
4. Bấm Thu mẫu · 4 giây, chờ 2 giây chuẩn bị rồi giữ **một động tác suốt 4 giây**. Di chuyển nhẹ được; không đang thè lưỡi rồi rụt vào trong cùng clip.
5. Chờ Đã lưu…, thả lỏng rồi thu tiếp. Mỗi nhãn **5 clip/buổi**.
6. Thu none khoảng **10 clip/buổi**: nói chuyện, nhìn quanh, chuyển tư thế; tránh giữ đúng mẫu mục tiêu. Nếu train neutral_01 thì không dùng mặt thả lỏng kéo dài làm none đối lập với chính nhãn đó.
7. Sang lần ghi khác mới đổi mã buổi; đổi điều kiện nhẹ rồi thu lại cả bộ nhãn. Tránh một nhãn chỉ được thu trong một điều kiện ánh sáng.
8. Xem thống kê. Nếu thu nhầm, báo mã người/buổi và thứ tự trước khi train để loại đúng clip; không tự đoán file UUID.

Chia theo người cần ít nhất 3 người thật, có đủ nhãn mỗi nhóm. Thử một người cần ít nhất 3 buổi riêng. Đây là mức tối thiểu chia tập, không bảo đảm chính xác; nhiều người/mẫu đa dạng vẫn cần thiết.

**Dữ liệu cá nhân:** bấm thu lưu pixel vùng miệng có thể khôi phục thành ảnh và đặc trưng mặt/tay trên máy người thu. Chỉ thu/chia sẻ khi đồng ý. Không push dữ liệu lên repo công khai. Bộ thử cũ giữ riêng vì khác định dạng.

## 8. Gửi và tổng hợp dữ liệu

Mỗi lần thu tạo **một JSON chứa nhiều khung**, không phải một video hay chỉ 4 ảnh. Thư mục:

~~~text
FER_Project/gesture_data/meme_training/clips/*.json
~~~

### Thành viên đóng gói

Dừng thu, chạy từ gốc repo:

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow"
New-Item -ItemType Directory -Force data_exports
Compress-Archive -Path .\FER_Project\gesture_data\meme_training\clips\*.json -DestinationPath .\data_exports\P02_S01.zip
~~~

Đổi tên ZIP theo người/buổi và dùng tên mới mỗi lần. Lệnh đóng gói **tất cả clip hiện có**, không lọc theo tên ZIP; mã thực nằm trong JSON. Chưa thu clip thì chưa có gì để nén.

Gửi ZIP riêng qua kênh nhóm đã thống nhất sau khi đồng ý chia sẻ dữ liệu miệng. gesture_data/, data_exports/ và ZIP bị Git bỏ qua; không dùng git add -f để đưa lên repo, issue, PR công khai.

### Người tổng hợp

Giải nén vào thư mục tạm, kiểm tra đúng JSON rồi chép vào FER_Project/gesture_data/meme_training/clips/. File dùng UUID; nếu trùng tên thì không ghi đè nội dung khác. Không đổi mã người/buổi để giả thành nhóm mới. Giữ ZIP gốc riêng để đối chiếu.

## 9. Huấn luyện mô hình chung

Người tổng hợp mở terminal thứ ba, BE/FE có thể giữ chạy nhưng **không thu thêm khi train**.

### Có ít nhất 3 người thật: chia theo người

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow\FER_Project"
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by subject --check-only
~~~

Nếu kiểm tra qua, chạy:

~~~powershell
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by subject
~~~

### Một người, ít nhất 3 buổi thật: thử theo buổi

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow\FER_Project"
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by session --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by session
~~~

Chỉ train khi kiểm tra qua. Kết quả theo buổi không đánh giá khả năng trên người mới.

### Train trước vài nhãn

~~~powershell
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by subject --labels angry_02 sad_04 disgust_04 none --check-only
.\.venv\Scripts\python.exe -m gesture_ml.train_meme --split-by subject --labels angry_02 sad_04 disgust_04 none
~~~

Mỗi nhãn phải có trong train/validation/test tách theo nhóm. Mặc định lấy nhãn đã có dữ liệu; phải có none và ít nhất một động tác. Thiếu dữ liệu sẽ dừng, không tạo model giả. Khi mở rộng phải train lại từ **tất cả nhãn muốn hỗ trợ**, không chỉ train nhãn mới rồi coi như cộng vào model cũ.

Kết quả:

~~~text
FER_Project/model/meme_classifier_runs/<thời_gian>/
├── classifier.joblib
├── report.json
├── confusion_matrix.png
└── READY
~~~

Đọc Accuracy, Macro-F1, bảng nhầm lẫn. Saved/READY chỉ nghĩa hoàn tất kỹ thuật, không bảo đảm nhận tốt cả 35. Nhãn khó/trùng có thể cần thêm mẫu, sửa động tác hoặc gom nhóm. MediaPipe có sẵn trích điểm; bộ phân loại RandomForest được nhóm tự train từ dữ liệu người thực hiện và pixel miệng.

## 10. Test mô hình vừa train

1. Xem báo cáo, ghi nhận hạn chế trước khi kết luận.
2. Ctrl+C terminal BE và chạy lại lệnh bước 5. FE có thể giữ chạy.
3. Ctrl+F5 trên web, chọn Theo động tác, bật camera.
4. Backend tự lấy bản **train hoàn tất mới nhất** trong meme_classifier_runs/. Danh mục lấy nhãn model đã học; không tạo file/sửa available cho từng ảnh.
5. Làm từng động tác, giữ khoảng một giây. Thử cả động tác ngoài mẫu/chuyển tư thế để kiểm tra gọi nhầm.
6. Mô hình chung thay luồng luật dự phòng; nhãn chưa train chưa tự nhận được. Vẫn một camera, một ô meme.

Test nghiêm túc trên người/buổi chưa dùng chỉnh model. Không xem khung liền nhau là mẫu độc lập; không chỉnh liên tục theo tập test rồi báo đó là đánh giá mới.

## 11. Mở lại, cập nhật và dừng

### Các lần mở máy sau

Không clone lại hay tạo lại venv. Chạy hai terminal như bước 5, mở URL Vite và cho phép camera.

### Cập nhật code

Nếu không sửa code cục bộ, dừng BE/FE:

~~~powershell
cd "$env:USERPROFILE\Projects\mood-meow"
git pull --ff-only
.\FER_Project\.venv\Scripts\python.exe -m pip install -r .\FER_Project\requirements.txt
cd frontend
npm.cmd ci
~~~

Chạy lại bước 5. Nếu Git báo thay đổi/conflict, giữ nguyên và hỏi nhóm; không reset/clean để xóa. Các thư mục dữ liệu bị ignore không được gửi đi bởi git push thông thường.

### Dừng

Dừng camera trên web rồi Ctrl+C từng terminal BE/FE; đóng tab nếu không dùng.

## 12. Lỗi thường gặp

| Hiện tượng | Xử lý |
|---|---|
| Không tìm thấy py/Python 3.11 | Cài đúng Python 3.11 + launcher, mở lại terminal, kiểm tra py -3.11 --version. |
| Không tìm thấy git/node/npm | Cài công cụ và mở lại terminal/VS Code để cập nhật PATH. |
| npm.ps1 bị chặn | Dùng npm.cmd ci / npm.cmd run dev như hướng dẫn, không cần đổi ExecutionPolicy. |
| No module named uvicorn/TensorFlow | Gọi Python trong FER_Project\.venv và cài requirements bằng chính Python đó. |
| pip: No matching distribution | Kiểm tra Python 3.11 **64-bit**, không dùng bản 32-bit hay Python khác. |
| Node không hỗ trợ | Chọn Node 22 từ 22.12 trở lên, mở lại terminal, chạy npm.cmd ci. |
| Errno 10048 / port 8000 bận | Ctrl+C ở terminal BE cũ rồi chạy một BE duy nhất; không chạy BE riêng cho từng chế độ. |
| Port 8000 không hiện web | Giao diện ở URL Local của Vite, không phải port API. |
| FE không kết nối API | BE phải startup xong ở 8000; FE chạy bằng Vite để proxy /api hoạt động. |
| Camera đen/không mở | Cho phép camera ở trình duyệt/Windows, đóng app và tab khác đang dùng webcam. |
| Thu mẫu bị khóa | Bật camera, chờ model/danh mục; xem lỗi trong khung thu. |
| Không đủ mẫu liên tục | Đưa mặt/miệng rõ vào hình, không che miệng, giữ động tác và thu lại. |
| Thè lưỡi chưa có model trên máy mới | Model cá nhân không được chia sẻ công khai; thu/train bộ chung bước 7–10. Không phải thiếu giao diện. |
| Train: không có dữ liệu | JSON phải ở gesture_data/meme_training/clips, không phải thư mục thử cũ. |
| Train: thiếu nhóm/nhãn | Thu cùng nhãn qua đủ người/buổi thật, có none; không giả mã. |
| Web vẫn là bản cũ | Restart BE nếu đổi Python, Ctrl+F5 trình duyệt. |

## Tệp chính và giới hạn repo

- [Thư viện Python](FER_Project/requirements.txt).
- [Thư viện/lệnh frontend](frontend/package.json).
- [Mapping ảnh và động tác](meme_samples_35/gesture_mapping.json).
- [Hướng dẫn 35 động tác](FER_Project/HUONG_DAN_THU_TRAIN_35_MEME.md).

Repo có mã nguồn cả hai chế độ, kho meme, model cảm xúc mặc định và tài nguyên MediaPipe/YuNet. Không có .venv, node_modules, clip vùng miệng, kết quả train cá nhân, hay model cảm xúc thử nghiệm cũ. Tài liệu/demo cũ có thể nhắc đường dẫn máy tác giả hoặc model không chia sẻ; dùng README này cho bản web hiện tại.

Meme là tài nguyên bên thứ ba cho demo; repo không cấp lại bản quyền ảnh. Thành viên tải code/thu mẫu không cần quyền push; sửa code thì chủ repo mời Collaborator hoặc dùng Pull Request. Không đăng dữ liệu người thu vào repo/issue/PR công khai.
