from pathlib import Path
from functools import lru_cache
import joblib,numpy as np
from gesture_ml.meme_dataset import ROOT,SCHEMA
def model_path():
    paths=[p for p in (ROOT/'model'/'meme_classifier_runs').glob('*/classifier.joblib') if (p.parent/'READY').is_file()]
    return max(paths,key=lambda p:p.stat().st_mtime_ns) if paths else None
@lru_cache(maxsize=1)
def load(path,mtime):
    data=joblib.load(path)
    if data['schema']!=SCHEMA:raise ValueError('Model schema differs from unified collector')
    return data['model']
def model():
    path=model_path()
    return load(str(path),path.stat().st_mtime_ns) if path else None
def status():
    m=model();p=model_path()
    return {'ready':m is not None,'labels':list(map(str,m.classes_)) if m is not None else [],'path':str(p.relative_to(ROOT)) if p else None,'schema_id':SCHEMA['schema_id']}
def predict(values):
    m=model()
    if m is None:raise FileNotFoundError('Train the unified meme classifier first')
    probs=m.predict_proba(np.asarray([values]))[0];order=np.argsort(probs);i=int(order[-1])
    label=str(m.classes_[i]);score=float(probs[i]);gap=score-float(probs[order[-2]])
    return {'id':label if label!='none' and score>=.60 and gap>=.20 else None,'label':label,'confidence':score,'gap':gap}
