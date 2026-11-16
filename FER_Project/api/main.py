import asyncio
from collections import deque
from contextlib import asynccontextmanager
import hashlib
from pathlib import Path
import random
import threading

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from emotion import EmotionDetector, FALLBACK_LABELS, DEFAULT_MODEL

ROOT = Path(__file__).resolve().parents[1]
catalog = {}
by_emotion = {label: [] for label in FALLBACK_LABELS}
inference_lock = threading.Lock()
detector = None


@asynccontextmanager
async def lifespan(app):
    global detector
    detector = EmotionDetector(DEFAULT_MODEL, smooth_frames=0)
    catalog.clear()
    for pool in by_emotion.values():
        pool.clear()
    for label in FALLBACK_LABELS:
        for path in sorted((ROOT / 'memes' / label).glob('*')):
            if path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}:
                continue
            key = hashlib.sha256(str(path.relative_to(ROOT)).encode()).hexdigest()[:20]
            catalog[key] = (path, label)
            by_emotion[label].append(key)
    yield


app = FastAPI(title='FER Meme API', lifespan=lifespan)


def meme_data(key):
    path, label = catalog[key]
    return {'id': key, 'emotion': label, 'url': f'/api/memes/{key}/file',
            'downloadUrl': f'/api/memes/{key}/file?download=true'}


def choose_meme(label, exclude=None):
    pool = by_emotion[label]
    choices = [key for key in pool if key != exclude] or pool
    return meme_data(random.choice(choices)) if choices else None


@app.get('/api/health')
def health():
    return {'ready': detector is not None, 'model': Path(DEFAULT_MODEL).stem.removeprefix('emotion_model_'),
            'memes': len(catalog), 'faceDetector': detector.face_backend}


@app.get('/api/memes/{key}/file')
def meme_file(key: str, download: bool = False):
    if key not in catalog:
        raise HTTPException(404, 'Không tìm thấy meme')
    path, label = catalog[key]
    return FileResponse(path, filename=f'meme-{label}-{key}{path.suffix}' if download else None)


@app.get('/api/suggestions/{label}')
def suggestion(label: str, exclude: str | None = None):
    if label not in by_emotion:
        raise HTTPException(400, 'Nhãn không hợp lệ')
    meme = choose_meme(label, exclude)
    if meme is None:
        raise HTTPException(404, 'Chưa có meme cho biểu cảm này')
    return meme


def infer(data):
    encoded = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if frame is None or max(frame.shape[:2]) > 1920:
        raise ValueError('Ảnh không hợp lệ hoặc quá lớn')
    with inference_lock:
        return detector.predict_emotion(frame)


@app.websocket('/api/recognize')
async def recognize(ws: WebSocket):
    await ws.accept()
    history = deque(maxlen=5)
    candidate, streak, current = None, 0, None
    try:
        while True:
            data = await ws.receive_bytes()
            if len(data) > 2_000_000:
                await ws.close(code=1009)
                break
            try:
                result = await asyncio.to_thread(infer, data)
            except ValueError as exc:
                await ws.send_json({'status': 'error', 'message': str(exc)})
                continue
            if result is None:
                history.clear()
                candidate, streak, current = None, 0, None
                await ws.send_json({'status': 'no_face', 'probs': {}})
                continue
            history.append([result['probs'][label] for label in FALLBACK_LABELS])
            probs = np.mean(history, axis=0)
            order = np.argsort(probs)
            index = int(order[-1])
            label = FALLBACK_LABELS[index]
            confidence = float(probs[index])
            gap = float(probs[index] - probs[order[-2]])
            accepted = confidence >= .55 and gap >= .15
            if accepted:
                streak = streak + 1 if candidate == label else 1
                candidate = label
            else:
                candidate, streak = None, 0
            stable = accepted and streak >= 3
            if stable and (current is None or current['emotion'] != label):
                current = choose_meme(label)
            await ws.send_json({'status': 'stable' if stable else 'uncertain',
                                'emotion': label, 'confidence': confidence,
                                'probs': dict(zip(FALLBACK_LABELS, map(float, probs))),
                                'meme': current if stable else None})
    except WebSocketDisconnect:
        pass


# Pilot gesture templates are independent from the emotion model/catalog.
GESTURE_ROOT = ROOT.parent / 'meme_samples_35'


def gesture_entries():
    import json
    source = GESTURE_ROOT / 'gesture_mapping.json'
    if not source.is_file():
        raise HTTPException(503, 'Chưa có bảng mẫu động tác')
    rows = json.loads(source.read_text(encoding='utf-8'))['entries']
    from gesture_ml.meme_runtime import status
    trained=status()
    result=[]
    for row in rows:
        if row['id'] in trained['labels']:
            result.append({**row,'recognition':{'engine':'trained_meme','label':row['id']}})
        elif row.get('available',row.get('pilot_candidate',False)):
            result.append(row)
    return result



def gesture_path(row):
    path = (GESTURE_ROOT / row['image']).resolve()
    if not path.is_relative_to(GESTURE_ROOT.resolve()) or not path.is_file():
        raise HTTPException(404, 'Không tìm thấy ảnh mẫu')
    return path


@app.get('/api/gestures')
def gestures():
    output = []
    for row in gesture_entries():
        gesture_path(row)
        key = row['id']
        output.append({'id': key, 'description': row['gesture_description'], 'notes': row.get('collection_notes', row['notes']), 'recognition': row.get('recognition'),
                       'meme': {'id': f'gesture-{key}', 'emotion': row['emotion_tag'],
                                'url': f'/api/gestures/{key}/file',
                                'downloadUrl': f'/api/gestures/{key}/file?download=true'}})
    return output


@app.get('/api/gestures/{key}/file')
def gesture_file(key: str, download: bool = False):
    row = next((row for row in gesture_entries() if row['id'] == key), None)
    if row is None:
        raise HTTPException(404, 'Mẫu chưa được hỗ trợ')
    path = gesture_path(row)
    return FileResponse(path, filename=f"gesture-{key}{path.suffix}" if download else None)


from api.gesture_training import router as gesture_training_router
app.include_router(gesture_training_router)




from api.tongue_pixels import router as tongue_pixels_router
app.include_router(tongue_pixels_router)

from api.meme_training import router as meme_training_router
app.include_router(meme_training_router)
