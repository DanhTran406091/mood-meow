"""Train on locally collected features. Never use adjacent frames as split groups."""
import argparse
from collections import Counter
import hashlib,json
from pathlib import Path
import sys
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score,classification_report,confusion_matrix,f1_score
from sklearn.model_selection import GroupShuffleSplit
from gesture_ml.meme_dataset import DATA_DIR,ROOT,SCHEMA,read_records,summary

def partition(records,by,labels=None):
    groups=np.array([r['subject'] if by=='subject' else r['subject']+'/'+r['session'] for r in records])
    if len(set(groups))<3:raise ValueError('Need at least 3 people (subject split) or 3 recording sessions (session split).')
    y=np.array([r['label'] for r in records])
    expected=set(labels or SCHEMA['labels'])
    # Select a split by label coverage only, never by test accuracy.
    for seed in range(42,242):
        trval,test=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=seed).split(y,groups=groups))
        tr,val=next(GroupShuffleSplit(n_splits=1,test_size=.25,random_state=seed).split(y[trval],groups=groups[trval]))
        train,validation=trval[tr],trval[val]
        if all(set(y[idx])==expected for idx in (train,validation,test)):
            assert not(set(groups[train])&set(groups[test]))
            assert not(set(groups[train])&set(groups[validation]))
            assert not(set(groups[validation])&set(groups[test]))
            return train,validation,test,groups
    raise ValueError('Every split needs all selected labels. Collect all labels for each person/session; do not random-split frames.')

def arrays(records,indices):
    x,y,weights=[],[],[]
    for i in indices:
        row=records[int(i)]
        for frame in row['frames']:
            x.append(frame['values']);y.append(row['label']);weights.append(1/len(row['frames']))
    return np.asarray(x),np.asarray(y),np.asarray(weights)

def selected_records(directory,labels):
    rows=read_records(directory)
    if labels:
        if 'none' not in labels or len(set(labels))<2:raise ValueError('Select at least one gesture plus none.')
        rows=[r for r in rows if r['label'] in labels]
    return rows

def run(args):
    records=selected_records(args.data,getattr(args,'labels',None))
    if not records:raise ValueError('No real samples yet. Use web collection first; no model was created.')
    labels=getattr(args,'labels',None) or sorted({r['label'] for r in records})
    if 'none' not in labels or len(labels)<2:raise ValueError('Collect at least one gesture and none across 3 real groups.')
    counts=Counter(r['label'] for r in records)
    missing=[label for label in labels if counts[label]<3]
    if missing:raise ValueError('Need at least 3 clips per label across separate groups: '+', '.join(missing))
    train,val,test,groups=partition(records,args.split_by,labels)
    x,y,w=arrays(records,train);vx,vy,_=arrays(records,val)
    candidates=[]
    for leaf in (1,3):
        model=RandomForestClassifier(n_estimators=250,max_features=.3,min_samples_leaf=leaf,class_weight='balanced',random_state=42,n_jobs=-1)
        model.fit(x,y,sample_weight=w)
        score=float(f1_score(vy,model.predict(vx),labels=labels,average='macro',zero_division=0))
        candidates.append((score,leaf))
    best=max(candidates,key=lambda r:r[0])
    final=RandomForestClassifier(n_estimators=250,max_features=.3,min_samples_leaf=best[1],class_weight='balanced',random_state=42,n_jobs=-1)
    fx,fy,fw=arrays(records,np.concatenate([train,val]));final.fit(fx,fy,sample_weight=fw)
    tx,ty,_=arrays(records,test);pred=final.predict(tx)
    # One vote per held-out clip to avoid treating correlated frames as independent trials.
    clip_true,clip_pred=[],[]
    for index in test:
        row=records[int(index)]
        probabilities=final.predict_proba([f['values'] for f in row['frames']]).mean(axis=0)
        clip_true.append(row['label']);clip_pred.append(str(final.classes_[int(probabilities.argmax())]))
    report={'model':'RandomForestClassifier','schema':SCHEMA,'split_by':args.split_by,
            'generalization_limit':'held-out people' if args.split_by=='subject' else 'held-out sessions; may include same people',
            'trained_labels':labels,'dataset':{'clips':len(records),'by_label':dict(counts)},'validation_candidates':[{'macro_f1':s,'min_samples_leaf':l} for s,l in candidates],
            'chosen_min_samples_leaf':best[1],
            'splits':{name:{'groups':sorted(set(groups[idx])),'clip_ids':[records[int(i)]['clip_id'] for i in idx],
                           'labels':dict(Counter(records[int(i)]['label'] for i in idx))} for name,idx in [('train',train),('validation',val),('test',test)]},
            'frame_test':{'accuracy':float(accuracy_score(ty,pred)),'macro_f1':float(f1_score(ty,pred,labels=labels,average='macro',zero_division=0))},
            'clip_test':{'accuracy':float(accuracy_score(clip_true,clip_pred)),
                         'macro_f1':float(f1_score(clip_true,clip_pred,labels=labels,average='macro',zero_division=0)),
                         'classification_report':classification_report(clip_true,clip_pred,labels=labels,output_dict=True,zero_division=0),
                         'confusion_matrix':confusion_matrix(clip_true,clip_pred,labels=labels).tolist()},
            'dataset_hash':hashlib.sha256(json.dumps(records,sort_keys=True).encode()).hexdigest(),
            'threshold_note':'Runtime probability >= .55 and top-two gap >= .15 are provisional, not calibrated probabilities or validation-tuned thresholds.'}
    import sklearn
    bundle={'model':final,'schema':SCHEMA,'sklearn_version':sklearn.__version__,'dataset_hash':report['dataset_hash']}
    if args.out.exists():raise ValueError('Output exists. Choose a new --out directory to preserve earlier results.')
    args.out.mkdir(parents=True)
    joblib.dump(bundle,args.out/'classifier.joblib')
    (args.out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from sklearn.metrics import ConfusionMatrixDisplay
    fig,ax=plt.subplots(figsize=(10,8))
    ConfusionMatrixDisplay.from_predictions(clip_true,clip_pred,labels=labels,xticks_rotation=45,cmap='Greens',ax=ax,colorbar=False)
    ax.set_title('Held-out clips — '+args.split_by+' split');fig.tight_layout();fig.savefig(args.out/'confusion_matrix.png',dpi=150);plt.close(fig)
    (args.out/'READY').write_text('Training and evaluation completed',encoding='utf-8')
    print('Saved:',args.out)
    print('Held-out clip Accuracy:',round(report['clip_test']['accuracy'],4),'Macro-F1:',round(report['clip_test']['macro_f1'],4))
    print('Limits:',report['generalization_limit'])

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,default=DATA_DIR)
    parser.add_argument('--out',type=Path,default=ROOT/'model'/'meme_classifier_runs'/__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S'))
    parser.add_argument('--split-by',choices=('subject','session'),default='subject')
    parser.add_argument('--labels',nargs='+',help='Subset of collected labels; include none. Other labels are preserved but excluded from this run.')
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    # A selected new batch must not silently discard earlier trained classes.
    if args.labels:
        from gesture_ml.meme_runtime import status
        previous=set(status()['labels'])-{'none'}
        args.labels=sorted(set(args.labels)|previous|{'none'})
        print('Accumulated training labels:', ', '.join(args.labels))
    try:
        if args.check_only:
            stats=summary(args.data);print(json.dumps(stats,indent=2));
            records=selected_records(args.data,getattr(args,'labels',None))
            if not records:raise ValueError('No data. Collect samples first.')
            partition(records,args.split_by,getattr(args,'labels',None) or sorted({r['label'] for r in records}));print('Split coverage OK. Not trained.');return
        run(args)
    except (ValueError,KeyError) as error:
        print('STOP:',error,file=sys.stderr);sys.exit(2)

if __name__=='__main__':main()
