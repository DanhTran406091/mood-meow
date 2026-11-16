from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,ConfigDict
from fastapi.responses import FileResponse
import json
from gesture_ml.meme_dataset import ROOT,SCHEMA,DATA_DIR,Clip,MemeFrame,save_clip,summary
from gesture_ml import meme_runtime
router=APIRouter(prefix='/api/meme-training')
def entries():return json.loads((ROOT.parent/'meme_samples_35'/'gesture_mapping.json').read_text(encoding='utf-8'))['entries']
@router.get('/templates')
def templates():return [{'id':r['id'],'description':r['gesture_description'],'notes':r.get('collection_notes',''),'url':f"/api/meme-training/images/{r['id']}"} for r in entries()]
@router.get('/images/{key}')
def image(key:str):
    row=next((r for r in entries() if r['id']==key),None)
    if row is None:raise HTTPException(404)
    root=(ROOT.parent/'meme_samples_35').resolve();path=(root/row['image']).resolve()
    if not path.is_relative_to(root) or not path.is_file():raise HTTPException(404)
    return FileResponse(path)
@router.get('/summary')
def stats():return summary()
@router.post('/clips')
def record(clip:Clip):
    try:return save_clip(clip,DATA_DIR)
    except ValueError as e:raise HTTPException(409,str(e)) from e
@router.get('/model')
def status():
    try:return meme_runtime.status()
    except ValueError as e:raise HTTPException(409,str(e)) from e
class Input(BaseModel):
    model_config=ConfigDict(extra='forbid')
    schema_id:str
    frame:MemeFrame
@router.post('/predict')
def predict(payload:Input):
    if payload.schema_id!=SCHEMA['schema_id']:raise HTTPException(422,'Schema mismatch')
    try:return meme_runtime.predict(payload.frame.values)
    except (ValueError,FileNotFoundError) as e:raise HTTPException(409,str(e)) from e
