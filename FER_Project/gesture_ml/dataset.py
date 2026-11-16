import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import threading
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

ROOT=Path(__file__).resolve().parents[1]
SCHEMA=json.loads((Path(__file__).parent/'schema.json').read_text(encoding='utf-8'))
DATA_DIR=ROOT/'gesture_data'/'clips'
WRITE_LOCK=threading.Lock()

class Frame(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False,extra='forbid')
    t_ms:float=Field(ge=0,le=10000)
    values:list[float]=Field(min_length=SCHEMA['dimension'],max_length=SCHEMA['dimension'])

    @field_validator('values')
    @classmethod
    def bounds(cls,values):
        if any(abs(x)>8 for x in values):raise ValueError('Feature out of bounds')
        return values

class Clip(BaseModel):
    model_config=ConfigDict(extra='forbid')
    clip_id:UUID
    subject:str=Field(pattern=r'^[A-Za-z0-9_-]{1,32}$')
    session:str=Field(pattern=r'^[A-Za-z0-9_-]{1,32}$')
    label:str
    schema_id:str
    frames:list[Frame]=Field(min_length=8,max_length=50)

    @field_validator('label')
    @classmethod
    def label_valid(cls,value):
        mapping=ROOT.parent/'meme_samples_35'/'gesture_mapping.json'
        labels={r['id'] for r in json.loads(mapping.read_text(encoding='utf-8'))['entries']}|{'none'}
        if value not in labels:raise ValueError('Unknown label')
        return value

    @field_validator('schema_id')
    @classmethod
    def schema_valid(cls,value):
        if value!=SCHEMA['schema_id']:raise ValueError('Feature schema mismatch')
        return value

    @model_validator(mode='after')
    def time_valid(self):
        times=[f.t_ms for f in self.frames]
        if any(b-a<150 for a,b in zip(times,times[1:])):raise ValueError('Frames too close or unordered')
        if times[-1]-times[0]<2500:raise ValueError('Clip too short; record again')
        return self

def save_clip(clip:Clip,directory:Path=DATA_DIR):
    record=clip.model_dump(mode='json')
    encoded=json.dumps(record,sort_keys=True,separators=(',',':')).encode()
    digest=hashlib.sha256(encoded).hexdigest()
    directory.mkdir(parents=True,exist_ok=True)
    target=directory/f'{clip.clip_id}.json'
    with WRITE_LOCK:
        if target.exists():
            old=json.loads(target.read_text(encoding='utf-8'))
            if old['content_hash']!=digest:raise ValueError('Clip ID already used with different contents')
            return {'id':str(clip.clip_id),'frames':len(clip.frames),'duplicate':True}
        record['content_hash']=digest
        record['saved_at']=datetime.now(timezone.utc).isoformat()
        temp=target.with_suffix('.part')
        temp.write_text(json.dumps(record,ensure_ascii=False),encoding='utf-8')
        temp.replace(target)
    return {'id':str(clip.clip_id),'frames':len(clip.frames),'duplicate':False}

def read_records(directory:Path=DATA_DIR):
    output=[]
    for path in sorted(directory.glob('*.json')):
        raw=json.loads(path.read_text(encoding='utf-8'))
        payload={key:raw[key] for key in Clip.model_fields}
        validated=Clip.model_validate(payload)
        output.append(validated.model_dump(mode='json'))
    return output

def summary(directory:Path=DATA_DIR):
    rows=read_records(directory)
    return {'clips':len(rows),'frames':sum(len(r['frames']) for r in rows),
            'subjects':len({r['subject'] for r in rows}),
            'sessions':len({(r['subject'],r['session']) for r in rows}),
            'by_label':dict(Counter(r['label'] for r in rows)),
            'by_subject':dict(Counter(r['subject'] for r in rows)),
            'schema_id':SCHEMA['schema_id'],'labels':SCHEMA['labels']}
