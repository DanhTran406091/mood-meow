from pathlib import Path
import threading
import joblib
import numpy as np
from gesture_ml.dataset import ROOT,SCHEMA

MODEL_PATH=ROOT/'model'/'gesture_classifier_v1'/'classifier.joblib'
_bundle=None
_mtime=None
_lock=threading.Lock()

def load_model():
    global _bundle,_mtime
    if not MODEL_PATH.is_file():return None
    mtime=MODEL_PATH.stat().st_mtime_ns
    with _lock:
        if _bundle is None or _mtime!=mtime:
            # Only load the local artifact produced by gesture_ml.train.
            data=joblib.load(MODEL_PATH)
            if data['schema']['schema_id']!=SCHEMA['schema_id']:raise ValueError('Model schema mismatch; retrain with current features')
            _bundle,_mtime=data,mtime
        return _bundle

def status():
    model=load_model()
    return {'ready':model is not None,'schema_id':SCHEMA['schema_id'],
            'labels':SCHEMA['labels'],'path':'model/gesture_classifier_v1/classifier.joblib'}

def predict(values):
    bundle=load_model()
    if bundle is None:raise FileNotFoundError('No trained gesture classifier yet')
    model=bundle['model']
    probs=model.predict_proba(np.asarray([values]))[0]
    order=np.argsort(probs);index=int(order[-1]);label=str(model.classes_[index])
    confidence=float(probs[index]);gap=float(probs[index]-probs[order[-2]])
    accepted=label!='none' and confidence>=.55 and gap>=.15
    return {'id':label if accepted else None,'label':label,'confidence':confidence,'gap':gap,
            'probs':dict(zip(map(str,model.classes_),map(float,probs)))}
