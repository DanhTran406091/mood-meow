"""Two-class pilot. Only train after real mouth samples have been collected."""
import argparse,hashlib,json,sys
from collections import Counter
from pathlib import Path
import joblib,numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score,classification_report,confusion_matrix,f1_score
from gesture_ml.dataset import ROOT
from gesture_ml.tongue_pixels import SCHEMA,DATA_DIR,records,summary

def split(rows,by):
    groups=np.array([r['subject'] if by=='subject' else r['subject']+'/'+r['session'] for r in rows])
    labels=np.array([r['label'] for r in rows])
    if len(set(groups))<3:raise ValueError('Need 3 different people or 3 real recording sessions; do not random-split frames.')
    for seed in range(42,142):
        tv,te=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=seed).split(labels,groups=groups))
        tr,va=next(GroupShuffleSplit(n_splits=1,test_size=.25,random_state=seed).split(labels[tv],groups=groups[tv]))
        tr,va=tv[tr],tv[va]
        if all(set(labels[i])==set(SCHEMA['labels']) for i in (tr,va,te)):return tr,va,te,groups
    raise ValueError('Each group must include both labels so every split can contain both classes.')

def arrays(rows,indices):
    x,y,w=[],[],[]
    for i in indices:
        row=rows[int(i)]
        for f in row['frames']:x.append(f['values']);y.append(row['label']);w.append(1/len(row['frames']))
    return np.array(x),np.array(y),np.array(w)

def train(args):
    rows=records(args.data)
    if not rows:raise ValueError('No real mouth samples. Collect them in the web app first.')
    if any(Counter(r['label'] for r in rows)[l]<3 for l in SCHEMA['labels']):raise ValueError('Need at least 3 clips for each label.')
    tr,va,te,groups=split(rows,args.split_by)
    if args.check_only:
        print(json.dumps(summary(args.data),indent=2));print('Grouped split OK; not trained.');return
    if args.out.exists():raise ValueError('Output exists. Use a new --out directory; existing results are preserved.')
    x,y,w=arrays(rows,tr);vx,vy,_=arrays(rows,va)
    scores=[]
    for leaf in (1,3):
        m=RandomForestClassifier(n_estimators=200,min_samples_leaf=leaf,class_weight='balanced',random_state=42,n_jobs=-1)
        m.fit(x,y,sample_weight=w);scores.append((float(f1_score(vy,m.predict(vx),average='macro',zero_division=0)),leaf))
    best=max(scores,key=lambda item:item[0])
    x,y,w=arrays(rows,np.concatenate([tr,va]))
    m=RandomForestClassifier(n_estimators=200,min_samples_leaf=best[1],class_weight='balanced',random_state=42,n_jobs=-1)
    m.fit(x,y,sample_weight=w)
    true,pred=[],[]
    for i in te:
        row=rows[int(i)];probs=m.predict_proba([f['values'] for f in row['frames']]).mean(axis=0)
        true.append(row['label']);pred.append(str(m.classes_[probs.argmax()]))
    report={'purpose':'Experimental tongue vs open-mouth pilot; not a full gesture classifier',
            'split_by':args.split_by,'limit':'Held-out sessions may contain the same person' if args.split_by=='session' else 'Held-out people; small sample size still limits conclusions',
            'schema':SCHEMA,'dataset':summary(args.data),'validation_candidates':scores,
            'test_clip_accuracy':float(accuracy_score(true,pred)),'test_clip_macro_f1':float(f1_score(true,pred,average='macro',zero_division=0)),
            'classification_report':classification_report(true,pred,labels=SCHEMA['labels'],output_dict=True,zero_division=0),
            'confusion_matrix':confusion_matrix(true,pred,labels=SCHEMA['labels']).tolist(),
            'splits':{name:{'groups':sorted(set(groups[idx])),'clip_ids':[rows[int(i)]['clip_id'] for i in idx]} for name,idx in [('train',tr),('validation',va),('test',te)]},
            'dataset_hash':hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()}
    args.out.mkdir(parents=True)
    joblib.dump({'model':m,'schema':SCHEMA},args.out/'classifier.joblib')
    (args.out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Saved pilot results:',args.out)
    print('Held-out clip Accuracy:',report['test_clip_accuracy'],'Macro-F1:',report['test_clip_macro_f1'])
    print('Not enabled for live meme selection. Review held-out results before integration.')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--data',type=Path,default=DATA_DIR)
    p.add_argument('--out',type=Path,default=ROOT/'model'/'tongue_pixels_v2')
    p.add_argument('--split-by',choices=('subject','session'),default='subject');p.add_argument('--check-only',action='store_true')
    args=p.parse_args()
    try:train(args)
    except ValueError as e:print('STOP:',e,file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
