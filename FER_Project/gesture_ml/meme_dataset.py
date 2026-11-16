"""Unified face/hand and mouth-image collection; old data remains separate."""
import json
from pathlib import Path
from collections import Counter
from pydantic import Field,field_validator
from gesture_ml.dataset import ROOT,Frame,Clip as LegacyClip,save_clip
SCHEMA=json.loads((Path(__file__).parent/'meme_schema.json').read_text(encoding='utf-8'))
DATA_DIR=ROOT/'gesture_data'/'meme_training'/'clips'
class MemeFrame(Frame):
    values:list[float]=Field(min_length=4760,max_length=4760)
    @field_validator('values')
    @classmethod
    def pixels_valid(cls,values):
        if any(v<0 or v>1 for v in values[152:]):raise ValueError('Invalid mouth RGB pixels')
        return values
class Clip(LegacyClip):
    frames:list[MemeFrame]=Field(min_length=8,max_length=50)
    @field_validator('schema_id')
    @classmethod
    def schema_valid(cls,value):
        if value!=SCHEMA['schema_id']:raise ValueError('Unified schema mismatch; do not mix old clips')
        return value
    @field_validator('label')
    @classmethod
    def label_valid(cls,value):
        if value not in SCHEMA['labels']:raise ValueError('Unknown meme gesture')
        return value
def read_records(directory=DATA_DIR):
    rows=[]
    for path in sorted(directory.glob('*.json')):
        raw=json.loads(path.read_text(encoding='utf-8'))
        rows.append(Clip.model_validate({k:raw[k] for k in Clip.model_fields}).model_dump(mode='json'))
    return rows
def summary(directory=DATA_DIR):
    rows=read_records(directory)
    return {'clips':len(rows),'frames':sum(len(r['frames']) for r in rows),'subjects':len({r['subject'] for r in rows}),'sessions':len({(r['subject'],r['session']) for r in rows}),'by_label':dict(Counter(r['label'] for r in rows)),'by_session':{g:dict(Counter(r['label'] for r in rows if r['subject']+'/'+r['session']==g)) for g in sorted({r['subject']+'/'+r['session'] for r in rows})},'schema_id':SCHEMA['schema_id']}
