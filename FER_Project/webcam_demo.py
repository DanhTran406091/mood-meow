"""
webcam_demo.py - Chay thu nhan dien cam xuc.

Cach dung:
    python webcam_demo.py                  # webcam so 0, model mac dinh trong model/
    python webcam_demo.py --camera 1       # thu webcam so 1
    python webcam_demo.py --image anh.jpg  # thu tren 1 anh (khi may khong co webcam)
    python webcam_demo.py --scan           # do tim webcam nao dang hoat dong
    python webcam_demo.py --model emotion_model_7class_v2.keras   # chon model khac trong model/
    python webcam_demo.py --model a.keras b.keras   # GHEP 2 model (trung binh xac suat)
    python webcam_demo.py --smooth 3       # lam muot it hon (phan ung nhanh hon)
    python webcam_demo.py --low-conf 0.5   # nguong "chua doan duoc" (mac dinh 0.6)
    python webcam_demo.py --blur 1.0       # lam mo nhe anh mat truoc khi du doan (thu khi webcam qua net)
    python webcam_demo.py --no-equalize    # tat can bang sang vung mat (de so sanh)

Nhan 'q' de thoat.
"""
import argparse
import os
import time

import cv2

from emotion import DEFAULT_MODEL, LOW_CONF, EmotionDetector

PREDICT_EVERY = 3   # chi du doan moi 3 frame de may CPU khong bi giat
UNCERTAIN_TEXTS = ["Dang phan tich...", "Dang doc cam xuc..."]   # hien khi chua du tu tin


def open_camera(index):
    """Tren Windows, backend DirectShow (CAP_DSHOW) thuong on dinh hon mac dinh."""
    if os.name == "nt":
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        if cap.isOpened():
            return cap
        cap.release()
    return cv2.VideoCapture(index)


def scan_cameras(max_index=5):
    print("Dang do tim webcam...")
    found = []
    for i in range(max_index):
        cap = open_camera(i)
        ok = cap.isOpened() and cap.read()[0]
        cap.release()
        print(f"  camera {i}: {'HOAT DONG' if ok else 'khong dung duoc'}")
        if ok:
            found.append(i)
    if not found:
        print("Khong tim thay webcam nao. Kiem tra: may co webcam khong, "
              "app khac (Zoom/Teams/Chrome) dang chiem camera, "
              "va Settings > Privacy > Camera da bat chua.")
    return found


def draw_result(frame, result):
    if not result:
        return
    x, y, w, h = result["box"]
    cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
    if result.get("uncertain", False):
        text = UNCERTAIN_TEXTS[int(time.time()) % len(UNCERTAIN_TEXTS)]   # doi cau moi giay
        cv2.putText(frame, text, (x, max(y - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)      # mau cam
        return
    text = f'{result["emotion"]} {result["confidence"] * 100:.0f}%'
    cv2.putText(frame, text, (x, max(y - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
    for i, (lab, p) in enumerate(sorted(result["probs"].items(), key=lambda kv: -kv[1])):
        cv2.putText(frame, f"{lab}: {p * 100:.0f}%", (10, 25 + 22 * i),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)


def run_image(path, model, equalize, low_conf, blur=0.0):
    frame = cv2.imread(path)
    if frame is None:
        raise RuntimeError(f"Khong doc duoc anh: {path}")
    detector = EmotionDetector(model_path=model, smooth_frames=0, equalize_face=equalize,
                               low_conf=low_conf, blur=blur)
    result = detector.predict_emotion(frame)
    if result is None:
        print("Khong phat hien khuon mat nao trong anh.")
    else:
        note = "  [do tu tin thap]" if result["uncertain"] else ""
        print(f'Cam xuc: {result["emotion"]} ({result["confidence"] * 100:.0f}%){note}')
        for lab, p in sorted(result["probs"].items(), key=lambda kv: -kv[1]):
            print(f"  {lab:9s} {p * 100:5.1f}%")
    draw_result(frame, result)
    cv2.imshow("Emotion Recognition - nhan phim bat ky de thoat", frame)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


def run_webcam(index, model, smooth, equalize, low_conf, blur=0.0):
    cap = open_camera(index)
    if not cap.isOpened():
        raise RuntimeError(
            f"Khong mo duoc webcam so {index}. Chay: python webcam_demo.py --scan")
    detector = EmotionDetector(model_path=model, smooth_frames=smooth,
                               equalize_face=equalize, low_conf=low_conf, blur=blur)

    frame_count = 0
    result = None
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_count % PREDICT_EVERY == 0:
            result = detector.predict_emotion(frame)
        frame_count += 1

        draw_result(frame, result)
        cv2.imshow("Emotion Recognition - nhan q de thoat", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--image", type=str, default=None)
    parser.add_argument("--scan", action="store_true")
    parser.add_argument("--model", nargs="+", default=[DEFAULT_MODEL],
                        help="1 model, hoac nhieu model de ghep (cach nhau bang dau cach)")
    parser.add_argument("--smooth", type=int, default=10)
    parser.add_argument("--low-conf", type=float, default=LOW_CONF)
    parser.add_argument("--blur", type=float, default=0.0, help="lam mo anh mat truoc khi du doan (thu 0.8-1.5)")
    parser.add_argument("--no-equalize", action="store_true")
    parser.add_argument("--equalize", action="store_true")
    args = parser.parse_args()

    # None = de emotion.py tu chon theo loai model
    equalize = True if args.equalize else (False if args.no_equalize else None)

    if args.scan:
        scan_cameras()
    elif args.image:
        run_image(args.image, args.model, equalize, args.low_conf, args.blur)
    else:
        run_webcam(args.camera, args.model, args.smooth, equalize, args.low_conf, args.blur)


if __name__ == "__main__":
    main()