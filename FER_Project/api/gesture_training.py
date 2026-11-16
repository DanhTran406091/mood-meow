from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field,field_validator
from gesture_ml.dataset import Clip,Frame,SCHEMA,save_clip,summary
from gesture_ml import runtime

router=APIRouter(prefix='/api/gesture-training')

@router.get('/schema')
def schema():return SCHEMA

@router.get('/summary')
def dataset_summary():return summary()

@router.post('/clips')
def record_clip(clip:Clip):
    try:return save_clip(clip)
    except ValueError as e:raise HTTPException(409,str(e)) from e

@router.get('/model')
def model_status():
    try:return runtime.status()
    except (ValueError,KeyError) as e:raise HTTPException(409,str(e)) from e

class Prediction(BaseModel):
    schema_id:str
    values:list[float]=Field(min_length=SCHEMA['dimension'],max_length=SCHEMA['dimension'])
    @field_validator('schema_id')
    @classmethod
    def schema_valid(cls,value):return Clip.schema_valid(value)
    @field_validator('values')
    @classmethod
    def values_valid(cls,value):return Frame(t_ms=0,values=value).values

@router.post('/predict')
def classify(payload:Prediction):
    try:return runtime.predict(payload.values)
    except FileNotFoundError as e:raise HTTPException(409,str(e)) from e


@router.get('/templates')
def collection_templates():
    import json
    from gesture_ml.dataset import ROOT
    mapping=json.loads((ROOT.parent/'meme_samples_35'/'gesture_mapping.json').read_text(encoding='utf-8'))
    return [{'id':r['id'],'description':r['gesture_description'],'notes':r['notes']} for r in mapping['entries']]
