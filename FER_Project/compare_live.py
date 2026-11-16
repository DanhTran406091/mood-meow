"""
compare_live.py - So sanh nhieu model (hoac ban GHEP, hoac cung model voi muc lam mo khac nhau) tren
CUNG mot khung hinh webcam.

    python compare_live.py --models a.keras a.keras@1.0 a.keras+b.keras

  +  noi cac model thanh 1 ban ghep (trung binh xac suat)
  @  them muc lam mo Gaussian ap len anh mat truoc khi du doan, vi du a.keras@1.0
--smooth va --low-conf giong webcam_demo (10 va 0.4). Dong co (?) la do tu tin duoi nguong. 'q' de thoat.
"""
import argparse

import cv2

from emotion import EmotionDetector
from webcam_demo import open_camera

PREDICT_EVERY = 3


def short(name):
    return name.replace("emotion_model_", "").replace(".keras", "")


def parse(spec):
    """'a.keras+b.keras@1.0' -> (['a.keras', 'b.keras'], 1.0)"""
    models, _, blur = spec.partition("@")
    return models.split("+"), float(blur) if blur else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="+", required=True)
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--smooth", type=int, default=10)
    ap.add_argument("--low-conf", type=float, default=0.4)
    args = ap.parse_args()

    detectors, names = [], []
    for spec in args.models:
        paths, blur = parse(spec)
        detectors.append(EmotionDetector(model_path=paths, smooth_frames=args.smooth,
                                         low_conf=args.low_conf, blur=blur))
        names.append("+".join(short(p) for p in paths) + (f"@{blur:g}" if blur else ""))
    cap = open_camera(args.camera)
    if not cap.isOpened():
        raise RuntimeError("Khong mo duoc webcam")

    n, results = 0, [None] * len(detectors)
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if n % PREDICT_EVERY == 0:
            results = [d.predict_emotion(frame) for d in detectors]
        n += 1

        for i, (name, r) in enumerate(zip(names, results)):
            if r:
                top = sorted(r["probs"].items(), key=lambda kv: -kv[1])[:2]
                mark = "(?) " if r["uncertain"] else ""
                text = f"{name}: {mark}{top[0][0]} {top[0][1] * 100:.0f}% / {top[1][0]} {top[1][1] * 100:.0f}%"
            else:
                text = f"{name}: -"
            cv2.putText(frame, text, (8, 22 + 22 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
        if results[0]:
            x, y, w, h = results[0]["box"]
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.imshow("compare_live - nhan q de thoat", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()