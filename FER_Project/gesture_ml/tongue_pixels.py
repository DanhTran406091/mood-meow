"""Independent mouth-feature pilot; does not change the original gesture schema."""
from collections import Counter
import json
from pathlib import Path
from pydantic import Field,field_validator
from gesture_ml.dataset import ROOT,Frame,Clip,save_clip

SCHEMA=json.loads((Path(__file__).parent/'tongue_pixels_schema.json').read_text(encoding='utf-8'))
DATA_DIR=ROOT/'gesture_data'/'tongue_pixels_v2'/'clips'

class MouthFrame(Frame):
    values:list[float]=Field(min_length=SCHEMA['dimension'],max_length=SCHEMA['dimension'])
    @field_validator('values')
    @classmethod
    def mouth_bounds(cls,values):
        if any(v<0 or v>1 for v in values):raise ValueError('Mouth features must be within [0,1]')
        return values

class MouthClip(Clip):
    frames:list[MouthFrame]=Field(min_length=8,max_length=50)
    @field_validator('label')
    @classmethod
    def label_valid(cls,value):
        if value not in SCHEMA['labels']:raise ValueError('Unknown mouth label')
        return value
    @field_validator('schema_id')
    @classmethod
    def schema_valid(cls,value):
        if value!=SCHEMA['schema_id']:raise ValueError('Mouth schema mismatch')
        return value

def records(directory=DATA_DIR):
    rows=[]
    for file in sorted(directory.glob('*.json')):
        raw=json.loads(file.read_text(encoding='utf-8'))
        rows.append(MouthClip.model_validate({key:raw[key] for key in MouthClip.model_fields}).model_dump(mode='json'))
    return rows

def summary(directory=DATA_DIR):
    rows=records(directory)
    return {'clips':len(rows),'frames':sum(len(r['frames']) for r in rows),
            'subjects':len({r['subject'] for r in rows}),
            'sessions':len({(r['subject'],r['session']) for r in rows}),
            'by_label':dict(Counter(r['label'] for r in rows)),'labels':SCHEMA['labels']}

def save(clip:MouthClip,directory=DATA_DIR):return save_clip(clip,directory)
