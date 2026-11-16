# Ánh xạ động tác cho 35 meme đã chọn

Đây là bản đặc tả để triển khai bước nhận diện tiếp theo, chưa phải bộ nhận diện đã chạy được. Nhãn cảm xúc được giữ theo phân nhóm của người dùng. Động tác con người là cách mô phỏng hình ảnh mèo, không khẳng định tâm trạng thực.

## Bộ thử đầu tiên

Chọn 7 mẫu có tín hiệu mặt/tay tương đối rõ để kiểm tra trước. Không yêu cầu cả 35 mẫu phải được nhận độc lập ngay. Tất cả mẫu vẫn tắt cho đến khi có kiểm chứng bằng người thực.

| Mã          | Động tác dự kiến                               |
| ----------- | ---------------------------------------------- |
| angry_02    | Nắm hai tay, đặt trước ngực như tư thế thủ     |
| angry_05    | Đưa một nắm tay lên gần má                     |
| surprise_04 | Mở mắt và miệng rõ, không đưa tay lên mặt      |
| happy_03    | Giơ một bàn tay mở lên cao, miệng mở hoặc cười |
| happy_04    | Nhắm mắt, đưa hai bàn tay mở cạnh mặt          |
| sad_04      | Đặt một bàn tay lên má và hơi nghiêng đầu      |
| sad_05      | Chắp hai tay trước ngực, nhìn về camera        |

## Toàn bộ ánh xạ

| Mã          | Ảnh                       | Động tác dự kiến                                      | Lưu ý                                                              |
| ----------- | ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| angry_01    | angry/cat (595).jpg       | Duỗi hai tay sang hai phía, quay nhẹ thân người       | Tư thế lấy cảm hứng từ ảnh; không yêu cầu vật cầm trên tay.        |
| angry_02    | angry/cat (1084).jpg      | Nắm hai tay, đặt trước ngực như tư thế thủ            | Cần phân biệt hai nắm tay với hai bàn tay mở.                      |
| angry_03    | angry/cat (1471).jpg      | Mở miệng lớn, siết lông mày, đưa hai tay phía trước   | Có thể lẫn với ngạc nhiên; chưa dùng để kích hoạt riêng.           |
| angry_04    | angry/cat (1271).jpg      | Hạ lông mày, mím môi, nhìn thẳng                      | Khác biệt nhỏ giữa các cá nhân; cần mẫu người thực.                |
| angry_05    | angry/cat (896).jpg       | Đưa một nắm tay lên gần má                            | Dựa vào vị trí tay và mặt, không chỉ nhãn angry.                   |
| fear_01     | fear/cat (1456).jpg       | Mở mắt, mở miệng và hơi ngửa đầu                      | Gần với surprise; không suy ra sợ hãi thực sự.                     |
| fear_02     | fear/cat (1141).jpg       | Mở miệng, co hai tay sát ngực                         | Cần phân biệt với tư thế thủ hai nắm tay.                          |
| fear_03     | fear/fear_03_selected.jpg | Nghiêng đầu, thu người và đưa hai tay gần một bên mặt | Mô phỏng tư thế núp; không yêu cầu có cột hay vật che.             |
| fear_04     | fear/cat (878).jpg        | Cúi người và đưa hai tay xuống phía trước             | Camera cần thấy phần thân và hai tay.                              |
| fear_05     | fear/fear_05_selected.jpg | Thu người, đặt hai tay gần cằm                        | Dễ trùng fear_02; chưa dùng làm mẫu độc lập.                       |
| surprise_01 | surprise/cat (168).jpg    | Mở mắt lớn, giữ miệng khép                            | Cần đo thay đổi so với mức mở mắt tự nhiên.                        |
| surprise_02 | surprise/cat (442).jpg    | Đưa mặt gần camera, hé miệng                          | Không dùng khoảng cách đơn thuần để kết luận cảm xúc.              |
| surprise_03 | surprise/cat (500).jpg    | Mở mắt lớn, hơi hé miệng, giữ đầu thẳng               | Gần surprise_01 và surprise_04; cần đối chứng.                     |
| surprise_04 | surprise/cat (1057).jpg   | Mở mắt và miệng rõ, không đưa tay lên mặt             | Mẫu biểu cảm mở miệng; không bảo đảm phân biệt fear.               |
| surprise_05 | surprise/cat (1362).jpg   | Đưa mặt gần camera, mắt mở lớn                        | Ảnh bị biến dạng phối cảnh; không tái hiện kích thước mắt của mèo. |
| happy_01    | happy/cat (144).png       | Cười khép miệng, hơi nâng cằm                         | Không ép mọi khuôn mặt phải có cùng độ cong môi.                   |
| happy_02    | happy/cat (317).jpg       | Mở miệng và thè lưỡi                                  | Cần kiểm chứng bộ phát hiện lưỡi, chưa có sẵn trong hệ thống.      |
| happy_03    | happy/cat (134).jpg       | Giơ một bàn tay mở lên cao, miệng mở hoặc cười        | Động tác chính là giơ một tay; biểu cảm là tín hiệu bổ sung.       |
| happy_04    | happy/cat (655).jpg       | Nhắm mắt, đưa hai bàn tay mở cạnh mặt                 | Tách khỏi nắm tay trước ngực bằng hình dạng và vị trí tay.         |
| happy_05    | happy/cat (103).jpg       | Đưa tay lên trán như chạm vành mũ                     | Không yêu cầu đội mũ hay dùng đồ ăn làm đạo cụ.                    |
| disgust_01  | disgust/cat (668).jpg     | Hơi kéo cằm vào, nhíu vùng mũi và môi                 | Khó phân biệt bằng quy tắc; cần dữ liệu người thực.                |
| disgust_02  | disgust/cat (1076).jpg    | Nheo mắt và thè lưỡi                                  | Có thể trùng happy_02; cần kiểm chứng trước.                       |
| disgust_03  | disgust/cat (1284).jpg    | Nheo mắt, nhăn mũi và hé miệng                        | Có thể lẫn angry; không tự động kích hoạt nếu phân vân.            |
| disgust_04  | disgust/cat (2059).jpg    | Mở mắt, mở miệng và đưa lưỡi ra                       | Gần happy_02; không gắn cứng cảm xúc với thè lưỡi.                 |
| disgust_05  | disgust/cat (558).jpg     | Thè lưỡi và đưa một bàn tay gần miệng                 | Bàn tay có thể che miệng; cần thử độ nhìn thấy.                    |
| neutral_01  | neutral/cat (177).jpg     | Nhìn thẳng, thả lỏng khuôn mặt                        | Vật trên đầu không phải điều kiện nhận diện.                       |
| neutral_02  | neutral/cat (319).jpg     | Nhìn thẳng, hơi nâng đầu                              | Tư thế gần neutral_01; chưa tách riêng.                            |
| neutral_03  | neutral/cat (91).jpg      | Nghiêng đầu nhẹ, đặt một tay phía trước               | Tư thế lấy cảm hứng từ ảnh; chưa có tín hiệu phân biệt mạnh.       |
| neutral_04  | neutral/cat (644).jpg     | Đầu thẳng, miệng khép và khuôn mặt thả lỏng           | Gần neutral_01; trang phục không phải tín hiệu nhận diện.          |
| neutral_05  | neutral/cat (1525).jpg    | Hơi nghiêng đầu và nhìn về camera                     | Không dùng khoảng cách hay góc chụp thay thế biểu cảm.             |
| sad_01      | sad/cat (495).jpg         | Đặt một bàn tay lên thái dương, hơi nghiêng đầu       | Cần tách khỏi happy_05 bằng vị trí tay và độ nghiêng đầu.          |
| sad_02      | sad/cat (553).jpg         | Đưa hai tay lên gần miệng, môi khép                   | Không yêu cầu cầm đồ ăn; hai tay không che toàn bộ mặt.            |
| sad_03      | sad/cat (674).jpg         | Nâng cằm, nhìn lên và hạ khóe môi                     | Dễ mất chi tiết khi ngửa quá nhiều; chưa dùng làm mẫu đầu.         |
| sad_04      | sad/cat (1300).jpg        | Đặt một bàn tay lên má và hơi nghiêng đầu             | Không yêu cầu có nước mắt; vị trí tay khác thái dương.             |
| sad_05      | sad/cat (494).jpg         | Chắp hai tay trước ngực, nhìn về camera               | Động tác là chắp tay, không phải bằng chứng người dùng đang buồn.  |

## Bước triển khai tiếp theo

1. Bổ sung bộ theo dõi mặt và hai bàn tay, cộng tư thế phần thân khi cần. Chưa đổi bộ phân loại cảm xúc hiện tại.
2. Cho người thử làm các động tác trong bộ thử, quan sát điểm và ghi mẫu đặc trưng. Không tự ghi hình hoặc lưu khuôn mặt nếu chưa được yêu cầu.
3. Xây dựng điều kiện phân biệt bằng góc ngón tay, khoảng cách tay–mặt chuẩn hóa và các đặc trưng miệng/mắt. Ngưỡng cần xác định từ mẫu, không tự coi các con số giả định là kết quả thực nghiệm.
4. Chỉ gọi một meme khi mẫu khớp ổn định; phân vân hoặc không khớp thì không chọn ngẫu nhiên để giả vờ đã nhận đúng.
5. Kiểm tra nhầm lẫn giữa các mẫu, thử thêm thành viên nhóm. Giữ các mẫu khó hoặc trùng ở trạng thái tắt.
6. Kết nối chế độ mới vào giao diện, giữ nguyên ghim và tải ảnh. Không thay chế độ cảm xúc hiện có cho đến khi kiểm tra xong.

Lưu ý: Hai ảnh cùng động tác không thể được phân biệt đáng tin cậy chỉ nhờ nhãn cảm xúc. Có thể gộp thành một nhóm biến thể, hoặc thu mẫu mới có tín hiệu phân biệt. Không dùng bộ phát hiện điểm người trực tiếp trên ảnh mèo rồi mặc định coi là hợp lệ.


## Danh mục dùng chung
Tất cả ảnh động tác được khai báo trong gesture_mapping.json, trả qua GET /api/gestures
và dùng chung GET /api/gestures/{id}/file (thêm ?download=true để tải).
available=true bật ảnh trong danh mục; false giữ ảnh chưa hỗ trợ ở dạng dự thảo.
recognition.engine chỉ bộ nhận diện (landmark_rules hoặc mouth_pixels_v2),
recognition.label là nhãn đầu ra đã được bộ đó hỗ trợ. Với mouth_pixels_v2 có
min_score, min_gap, hold_ms để cấu hình quyết định và thời gian giữ.
Không tạo API hay file Python riêng cho từng ảnh. Thêm ảnh không tự tạo khả năng
nhận diện động tác mới: cần bộ nhận diện đã hỗ trợ nhãn đó trước khi bật available.
