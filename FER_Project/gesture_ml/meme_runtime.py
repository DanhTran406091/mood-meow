from functools import lru_cache
import joblib,numpy as np
from gesture_ml.meme_dataset import ROOT,SCHEMA

def completed_paths():
    paths=[p for p in (ROOT/'model'/'meme_classifier_runs').glob('*/classifier.joblib') if (p.parent/'READY').is_file()]
    return sorted(paths,key=lambda p:(p.stat().st_mtime_ns,str(p)))

def model_path():
    paths=completed_paths()
    return paths[-1] if paths else None

@lru_cache(maxsize=8)
def load(path,mtime):
    data=joblib.load(path)
    if data['schema']!=SCHEMA:raise ValueError('Model schema differs from unified collector')
    return data['model']

def registered():
    # Newest completed artifact owns each label; earlier runs retain labels
    # missing from a later small training run. Never compare raw scores across
    # independently trained classifiers as if they were calibrated.
    owners={}
    for path in completed_paths():
        m=load(str(path),path.stat().st_mtime_ns)
        for label in map(str,m.classes_):
            if label!='none':owners[label]=path
    return owners

def status():
    owners=registered();latest=model_path()
    return {'ready':bool(owners),'labels':sorted(owners)+(['none'] if owners else []),
            'path':str(latest.relative_to(ROOT)) if latest else None,
            'models':sorted({str(p.relative_to(ROOT)) for p in owners.values()}),
            'schema_id':SCHEMA['schema_id']}

def predict(values):
    owners=registered()
    if not owners:raise FileNotFoundError('Train the unified meme classifier first')
    candidates=[];details=[]
    for path in sorted(set(owners.values())):
        m=load(str(path),path.stat().st_mtime_ns)
        probs=m.predict_proba(np.asarray([values]))[0];order=np.argsort(probs);i=int(order[-1])
        label=str(m.classes_[i]);score=float(probs[i]);gap=score-float(probs[order[-2]]) if len(order)>1 else 0
        details.append({'label':label,'confidence':score,'gap':gap})
        if label!='none' and owners.get(label)==path and score>=.60 and gap>=.20:
            candidates.append(label)
    return {'id':candidates[0] if len(candidates)==1 else None,'candidates':candidates,
            'ambiguous':len(candidates)>1,'trained_labels':sorted(owners),'predictions':details}
