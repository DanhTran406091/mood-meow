"""
meme_demo.py - Webcam nhan dien cam xuc -> hien 1 meme meo tuong ung (muc 1).

Dat file nay trong FER_Project, canh emotion.py. Meme dat trong thu muc  FER_Project/memes/
chia theo cam xuc, moi cam xuc 1 thu muc con:

    FER_Project/
      emotion.py  webcam_demo.py  meme_demo.py
      model/
      memes/
        angry/  disgust/  fear/  happy/  neutral/  sad/  surprise/     <- bo anh vao day

(Neu thu muc memes co dang train/val/test/<cam xuc>/ thi van doc duoc.)

Cach dung:
    python meme_demo.py
    python meme_demo.py --model emotion_model_96_both_v2.keras --camera 1
    python meme_demo.py --memes duong_dan_khac     # dung thu muc meme khac

Phim:  n = doi sang meme khac cung cam xuc   |   q = thoat
"""
import argparse
import os
import random

import cv2
import numpy as np

from emotion import EmotionDetector
from webcam_demo import PREDICT_EVERY, open_camera

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
CAMERA_WINDOW = "1 - Camera - q de thoat"
MEME_WINDOW = "2 - Meme"
PROBS_WINDOW = "3 - Xac suat 7 cam xuc"

VIEW_H = 480          # chieu cao cua so meme
STABLE_NEEDED = 3     # so lan du doan lien tiep cung 1 cam xuc moi doi meme


def load_meme_index(root):
    """Tra ve {cam_xuc: [duong_dan_anh, ...]} tu root/<cam xuc>/ (va root/train|val|test/<cam xuc>/)."""
    if not os.path.isdir(root):
        raise RuntimeError(f"Khong thay thu muc meme: '{root}'. "
                           "Tao thu muc 'memes' trong FER_Project, ben trong co 7 thu muc cam xuc.")
    index = {lab: [] for lab in LABELS}
    for lab in LABELS:
        for base in (root, *(os.path.join(root, s) for s in ("train", "val", "test"))):
            d = os.path.join(base, lab)
            if os.path.isdir(d):
                index[lab] += [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.lower().endswith(EXTS)]
    if sum(len(v) for v in index.values()) == 0:
        raise RuntimeError(f"Khong tim thay anh meme nao trong '{root}'. "
                           "Can co cac thu muc con: " + ", ".join(LABELS))
    for lab in LABELS:
        print(f"[meme] {lab:9s}: {len(index[lab])} anh")
    return index


def read_image(path):
    """cv2.imread loi voi duong dan co ky tu Unicode tren Windows -> doc bang imdecode."""
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


def placeholder(text):
    img = np.full((VIEW_H, VIEW_H, 3), 40, np.uint8)
    cv2.putText(img, text, (20, VIEW_H // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    return img


def make_meme_view(path, emotion):
    img = read_image(path)
    if img is None:
        return placeholder("Khong doc duoc anh")
    h, w = img.shape[:2]
    img = cv2.resize(img, (max(int(w * VIEW_H / h), 1), VIEW_H), interpolation=cv2.INTER_AREA)
    cv2.rectangle(img, (0, 0), (img.shape[1], 34), (0, 0, 0), -1)
    cv2.putText(img, emotion, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--memes", default=os.path.join(HERE, "memes"), help="thu muc meme (mac dinh: FER_Project/memes)")
    ap.add_argument("--model", nargs="+", default=["emotion_model_96_both.keras"])
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--smooth", type=int, default=3)
    ap.add_argument("--low-conf", type=float, default=0.4)
    ap.add_argument("--min-gap", type=float, default=0.0,
                    help="chenh lech toi thieu giua hai nhan cao nhat (0 = tat)")
    ap.add_argument("--diagnostics", action="store_true", help="hien anh dau vao va 7 diem du doan")
    ap.add_argument("--equalize", action="store_true", help="thu can bang sang vung mat; khong bat mac dinh")
    ap.add_argument("--face-detector", choices=("auto", "yunet", "haar"), default="auto")
    args = ap.parse_args()

    index = load_meme_index(args.memes)
    detector = EmotionDetector(model_path=args.model, smooth_frames=args.smooth, low_conf=args.low_conf,
                               min_gap=args.min_gap, equalize_face=True if args.equalize else None,
                               face_detector=args.face_detector)
    cap = open_camera(args.camera)
    if not cap.isOpened():
        raise RuntimeError(f"Khong mo duoc webcam so {args.camera}. Chay: python webcam_demo.py --scan")

    setup_windows(args.diagnostics)
    controls = WindowControls()
    for name in (CAMERA_WINDOW, MEME_WINDOW, PROBS_WINDOW) if args.diagnostics else (CAMERA_WINDOW, MEME_WINDOW):
        cv2.setMouseCallback(name, controls.mouse)

    current_emotion, current_path = None, None
    candidate, streak = None, 0
    meme_view = placeholder("Dua mat vao camera")
    n, result = 0, None

    def show_new(emotion):
        nonlocal current_path, meme_view
        pool = index.get(emotion, [])
        if not pool:
            current_path = None
            meme_view = placeholder(f"Chua co meme cho: {emotion}")
            return
        choices = [p for p in pool if p != current_path] or pool   # tranh lap lai anh vua hien
        current_path = random.choice(choices)
        meme_view = make_meme_view(current_path, emotion)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if n % PREDICT_EVERY == 0:
                result = detector.predict_emotion(frame)
                if result and not result["uncertain"]:
                    emo = result["emotion"]
                    streak = streak + 1 if emo == candidate else 1
                    candidate = emo
                    if streak < STABLE_NEEDED:
                        current_emotion, current_path = None, None
                        meme_view = placeholder("Dang cho nhan on dinh...")
                    elif emo != current_emotion:   # on dinh moi doi meme
                        current_emotion = emo
                        show_new(emo)
                else:
                    candidate, streak = None, 0
                    current_emotion, current_path = None, None
                    meme_view = placeholder("Chua chac chan" if result else "Khong thay khuon mat")
            n += 1

            if result:
                x, y, w, h = result["box"]
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                label = "Chua chac chan" if result["uncertain"] else f'{result["emotion"]} {result["confidence"] * 100:.0f}%'
                cv2.putText(frame, label, (x, max(y - 10, 20)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            cv2.imshow(CAMERA_WINDOW, frame)
            cv2.imshow(MEME_WINDOW, meme_view)
            if args.diagnostics:
                cv2.imshow(PROBS_WINDOW, diagnostic_view(detector, result))

            key = controls.read()
            windows = (CAMERA_WINDOW, MEME_WINDOW, PROBS_WINDOW) if args.diagnostics else (CAMERA_WINDOW, MEME_WINDOW)
            if key == ord("q") or any(window_closed(name) for name in windows):
                break
            if key == ord("n") and current_emotion:
                show_new(current_emotion)
            if key == ord("e") and args.diagnostics:
                for entry in detector.entries:
                    entry["equalize"] = not entry["equalize"]
                if detector.history is not None:
                    detector.history.clear()
                detector.last_inputs = []
                candidate, streak = None, 0
                current_emotion, current_path, result = None, None, None
                meme_view = placeholder("Da doi can bang sang - dang cho")

    finally:
        cap.release()
        cv2.destroyAllWindows()


def setup_windows(diagnostics):
    """Ba cua so rieng, dat canh nhau; camera luon giu anh day du."""
    width = 1500
    if os.name == "nt":
        import ctypes
        width = ctypes.windll.user32.GetSystemMetrics(0)
    available = max(600, width - 60)
    camera_width = int(available * (0.40 if diagnostics else 0.55))
    other_width = int(available * (0.30 if diagnostics else 0.45))
    specs = [(CAMERA_WINDOW, 10, camera_width, int(camera_width * 0.75)),
             (MEME_WINDOW, camera_width + 25, other_width, other_width)]
    if diagnostics:
        specs.append((PROBS_WINDOW, camera_width + other_width + 40,
                      max(240, other_width - 15), int(other_width * 0.92)))
    for name, x, w, h in specs:
        cv2.namedWindow(name, cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
        cv2.resizeWindow(name, w, h)
        cv2.moveWindow(name, x, 45)


def window_closed(name):
    try:
        return cv2.getWindowProperty(name, cv2.WND_PROP_VISIBLE) < 1
    except cv2.error:
        return True


class WindowControls:
    """Phim vat ly tren Windows, chi doc khi cua so cua tien trinh co focus."""
    def __init__(self):
        self.pending = None
        self.held = set()
        self.user32 = None
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes
            self.ctypes = ctypes
            self.user32 = ctypes.WinDLL("user32", use_last_error=True)
            self.user32.GetForegroundWindow.restype = wintypes.HWND
            self.user32.GetWindowThreadProcessId.argtypes = (wintypes.HWND, ctypes.POINTER(wintypes.DWORD))
            self.user32.GetAsyncKeyState.argtypes = (ctypes.c_int,)
            self.user32.GetAsyncKeyState.restype = ctypes.c_short

    def mouse(self, event, x, y, flags, param):
        # Chuot phai trong bat ky cua so nao de doi can bang sang.
        if event == cv2.EVENT_RBUTTONDOWN:
            self.pending = ord("e")

    def read(self):
        raw = cv2.waitKeyEx(10)
        key = raw & 0xFF if raw >= 0 else -1
        if key in (ord("Q"), ord("E"), ord("N")):
            key += 32
        if key == 27:
            key = ord("q")
        if self.user32 is not None:
            pid = self.ctypes.c_ulong()
            hwnd = self.user32.GetForegroundWindow()
            self.user32.GetWindowThreadProcessId(hwnd, self.ctypes.byref(pid))
            down = {k for k in (ord("Q"), ord("E"), ord("N"), 27)
                    if self.user32.GetAsyncKeyState(k) & 0x8000}
            if pid.value == os.getpid():
                fresh = down - self.held
                if fresh:
                    pressed = min(fresh)
                    key = ord("q") if pressed == 27 else pressed + 32
                elif down:
                    key = -1  # Khong bat/tat lien tuc khi giu phim.
            self.held = down
        if self.pending is not None:
            key, self.pending = self.pending, None
        return key


def diagnostic_view(detector, result):
    """Chi bieu do; anh camera va khung mat o cua so so 1."""
    panel = np.full((450, 500, 3), 30, np.uint8)
    def text(value, x, y, color=(230, 230, 230)):
        cv2.putText(panel, value, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55, color, 1, cv2.LINE_AA)
    text("Diem du doan sau lam muot", 15, 28)
    if result:
        # Thu tu co dinh de theo doi fear va cac lop khac khi diem thay doi.
        for i, label in enumerate(LABELS):
            p = result['probs'].get(label, 0.0)
            y = 65 + i * 37
            color = (70, 210, 255) if label == result['emotion'] else (60, 190, 100)
            text(f"{label:9s} {p * 100:5.1f}%", 15, y, color)
            cv2.rectangle(panel, (215, y - 14), (215 + int(260 * p), y), color, -1)
        text(f"Gap: {result['gap'] * 100:.1f} diem phan tram", 15, 330)
        text(result['reason'] or "Dat nguong; van co the sai", 15, 357)
    else:
        text("Chua co khuon mat / dang khoi tao", 15, 90)
    states = ', '.join('ON' if e['equalize'] else 'OFF' for e in detector.entries)
    text(f"Nguong {detector.low_conf:.2f} | gap {detector.min_gap:.2f}", 15, 387)
    text("Can bang sang: " + states, 15, 412)
    text("E / chuot phai: can bang sang | X: thoat", 15, 439)
    return panel


if __name__ == "__main__":
    main()
