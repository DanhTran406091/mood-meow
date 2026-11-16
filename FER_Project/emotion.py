"""
emotion.py - Module nhan dien khuon mat + cam xuc (phan 1 va 2 cua de tai).

Phan meme (phan 3) chi can:
    from emotion import EmotionDetector
    detector = EmotionDetector()                      # 1 model mac dinh
    detector = EmotionDetector(["a.keras", "b.keras"]) # GHEP nhieu model: lay trung binh xac suat
    result = detector.predict_emotion(frame)           # frame: anh BGR tu OpenCV
    if result:
        print(result["emotion"], result["confidence"], result["uncertain"])

Model dat trong thu muc model/ (moi model gom 2 file cung ten: .keras va .json).
Cac model ghep voi nhau phai cung thu tu nhan va cung le cat mat (cung dataset/cach chuan bi).
result["uncertain"] = True khi do tu tin thap hon LOW_CONF: nen coi la "chua doan duoc".
"""
import json
import os
from collections import deque

import cv2
import numpy as np
import tensorflow as tf

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(HERE, "model")
DEFAULT_MODEL = "emotion_model_96_both.keras"
DEFAULT_LABELS = os.path.join(MODEL_DIR, "labels.json")
FALLBACK_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
LOW_CONF = 0.6   # do tu tin cao nhat thap hon muc nay -> result["uncertain"] = True


def resolve_model_path(path):
    """Ten file -> tim trong model/ roi canh emotion.py; duong dan co thu muc -> dung nguyen."""
    if os.path.dirname(path):
        if os.path.exists(path):
            return path
    else:
        for cand in (os.path.join(MODEL_DIR, path), os.path.join(HERE, path)):
            if os.path.exists(cand):
                return cand
    have = sorted(f for f in os.listdir(MODEL_DIR) if f.endswith(".keras")) if os.path.isdir(MODEL_DIR) else []
    raise FileNotFoundError(f"Khong thay model '{path}'. Cac model trong model/: {have}")


def load_config(model_path, labels_path):
    """Doc cau hinh di kem model (file <ten_model>.json: nhan, anh mau, le cat mat)."""
    cfg = {"color": False, "margin": 0.0, "labels": None}
    sidecar = os.path.splitext(model_path)[0] + ".json"
    if os.path.exists(sidecar):
        with open(sidecar, encoding="utf-8") as f:
            cfg.update(json.load(f))
    elif os.path.exists(labels_path):
        with open(labels_path, encoding="utf-8") as f:
            cfg["labels"] = json.load(f)
    if not cfg["labels"]:
        cfg["labels"] = FALLBACK_LABELS
    return cfg


class EmotionDetector:
    def __init__(self, model_path=DEFAULT_MODEL, labels_path=DEFAULT_LABELS,
                 smooth_frames=10, equalize_face=None, low_conf=LOW_CONF, blur=0.0,
                 min_gap=0.0, face_detector="auto"):
        """
        model_path: ten 1 model, hoac list nhieu model de ghep (trung binh xac suat).
        smooth_frames: so frame gan nhat dung de lam muot ket qua (0 = tat).
        equalize_face: can bang sang vung mat. None = tu chon (model xam: bat, model mau: tat).
        low_conf: do tu tin thap hon muc nay thi result["uncertain"] = True.
        blur: do lam mo Gaussian (sigma, don vi pixel tren anh mat da thu nho) ap len anh mat truoc khi
              dua vao model; 0 = tat. Dung de thu khi webcam qua net so voi anh luc train.
        """
        if not 0 <= low_conf <= 1 or not 0 <= min_gap <= 1:
            raise ValueError("low_conf va min_gap phai nam trong [0, 1]")
        if smooth_frames < 0:
            raise ValueError("smooth_frames khong duoc am")
        self.last_inputs = []
        paths = [model_path] if isinstance(model_path, str) else list(model_path)
        if not paths:
            raise ValueError("Can it nhat mot model")
        self.entries, labels, margin = [], None, None
        for p in paths:
            p = resolve_model_path(p)
            model = tf.keras.models.load_model(p)
            cfg = load_config(p, labels_path)
            color = bool(cfg["color"])
            if labels is None:
                labels, margin = cfg["labels"], float(cfg["margin"])
            elif cfg["labels"] != labels or abs(float(cfg["margin"]) - margin) > 1e-6:
                raise ValueError(f"Model '{os.path.basename(p)}' khac thu tu nhan hoac le cat mat "
                                 "so voi model dau tien - khong ghep duoc")
            eq = (not color) if equalize_face is None else equalize_face
            self.entries.append({"model": model, "color": color, "equalize": eq})
            print(f"[emotion] {os.path.basename(p)} | color={color} margin={cfg['margin']} "
                  f"input={model.input_shape[1:3]}")
        self.labels, self.margin = labels, margin
        self.low_conf = low_conf
        self.min_gap = min_gap
        self.blur = blur

        if face_detector not in ("auto", "yunet", "haar"):
            raise ValueError("face_detector phai la auto, yunet hoac haar")
        yunet_path = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
        self.yunet = None
        if face_detector == "yunet" or (face_detector == "auto" and os.path.isfile(yunet_path)):
            if not os.path.isfile(yunet_path):
                raise FileNotFoundError(f"Khong thay YuNet: {yunet_path}")
            self.yunet = cv2.FaceDetectorYN.create(
                yunet_path, "", (320, 320), 0.8, 0.3, 5000)
        self.face_backend = "yunet" if self.yunet is not None else "haar"
        print(f"[face] {self.face_backend}")

        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            raise RuntimeError("Khong nap duoc Haar cascade cua OpenCV")
        self.clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        self.clahe_face = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))

        self.history = deque(maxlen=smooth_frames) if smooth_frames > 0 else None

    # ---------- Phan 1: phat hien khuon mat ----------
    def detect_faces(self, frame):
        """Tra ve danh sach (x, y, w, h)."""
        if self.yunet is not None:
            height, width = frame.shape[:2]
            scale = min(1.0, 640.0 / max(height, width))
            small = cv2.resize(frame, (max(1, round(width * scale)),
                                       max(1, round(height * scale))))
            sh, sw = small.shape[:2]
            self.yunet.setInputSize((sw, sh))
            _, detections = self.yunet.detect(small)
            boxes = []
            if detections is not None:
                for detection in detections:
                    x, y, w, h = detection[:4]
                    x1 = max(0, int(np.floor(x * width / sw)))
                    y1 = max(0, int(np.floor(y * height / sh)))
                    x2 = min(width, int(np.ceil((x + w) * width / sw)))
                    y2 = min(height, int(np.ceil((y + h) * height / sh)))
                    if x2 - x1 >= 40 and y2 - y1 >= 40:
                        boxes.append((x1, y1, x2 - x1, y2 - y1))
            return boxes
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = self.clahe.apply(gray)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
        return list(faces)

    # ---------- Phan 2: nhan dien cam xuc ----------
    def _crop(self, frame, box):
        """PHAI giong het crop_with_margin trong prepare_yolo_faces_kaggle.py."""
        x, y, w, h = box
        m = int(round(max(w, h) * self.margin))
        H, W = frame.shape[:2]
        return frame[max(y - m, 0):min(y + h + m, H), max(x - m, 0):min(x + w + m, W)]

    def _prep_face(self, crop, e):
        """Chuyen anh mat da cat thanh dau vao cho 1 model."""
        _, in_h, in_w, in_c = e["model"].input_shape
        if e["color"]:
            face = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            face = cv2.resize(face, (in_w, in_h), interpolation=cv2.INTER_AREA)
            if self.blur > 0:
                face = cv2.GaussianBlur(face, (0, 0), self.blur)
            if e["equalize"]:                            # can bang sang kenh L, giu nguyen mau
                lab = cv2.cvtColor(face, cv2.COLOR_RGB2LAB)
                lab[..., 0] = self.clahe_face.apply(lab[..., 0])
                face = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        else:
            face = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            face = cv2.resize(face, (48, 48))
            if e["equalize"]:
                face = cv2.equalizeHist(face)
            if (in_h, in_w) != (48, 48):
                face = cv2.resize(face, (in_w, in_h), interpolation=cv2.INTER_LINEAR)
            face = np.stack([face] * 3, axis=-1) if in_c == 3 else face[..., np.newaxis]
        return face.astype("float32")                    # giu 0-255, model tu chuan hoa ben trong

    def _probs_for_face(self, frame, box):
        crop = self._crop(frame, box)
        self.last_inputs = [self._prep_face(crop, e) for e in self.entries]
        probs = [e["model"].predict(face[np.newaxis, ...], verbose=0)[0]
                 for e, face in zip(self.entries, self.last_inputs)]
        return np.mean(probs, axis=0)                    # ghep nhieu model: trung binh xac suat

    def predict_emotion(self, frame):
        """
        Nhan dien cam xuc cua khuon mat LON NHAT trong frame.
        Tra ve dict {emotion, confidence, uncertain, probs, box} hoac None neu khong thay mat.
        """
        faces = self.detect_faces(frame)
        if not faces:
            self.last_inputs = []
            if self.history is not None:
                self.history.clear()
            return None

        box = max(faces, key=lambda b: b[2] * b[3])   # mat lon nhat
        probs = self._probs_for_face(frame, box)

        if self.history is not None:
            self.history.append(probs)
            probs = np.mean(self.history, axis=0)      # lam muot qua nhieu frame

        idx = int(np.argmax(probs))
        gap = float(probs[idx] - np.partition(probs, -2)[-2])
        reasons = []
        if probs[idx] < self.low_conf:
            reasons.append("Diem thap")
        if gap < self.min_gap:
            reasons.append("Hai nhan gan nhau")
        return {
            "emotion": self.labels[idx],
            "confidence": float(probs[idx]),
            "uncertain": bool(reasons),
            "reason": "; ".join(reasons),
            "gap": gap,
            "probs": {lab: float(p) for lab, p in zip(self.labels, probs)},
            "box": tuple(int(v) for v in box),
        }
