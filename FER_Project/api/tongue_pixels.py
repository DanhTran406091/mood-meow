from fastapi import APIRouter,HTTPException
from gesture_ml.tongue_pixels import SCHEMA,MouthClip,save,summary
router=APIRouter(prefix='/api/tongue-pixels')
@router.get('/schema')
def schema():return SCHEMA
@router.get('/summary')
def stats():return summary()
@router.post('/clips')
def record(clip:MouthClip):
    try:return save(clip)
    except ValueError as e:raise HTTPException(409,str(e)) from e


from functools import lru_cache
from pydantic import BaseModel,Field,ConfigDict
from gesture_ml.dataset import ROOT
import joblib

class PredictionInput(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False,extra='forbid')
    values:list[float]=Field(min_length=4608,max_length=4608)
    schema_id:str

@lru_cache(maxsize=1)
def trained_model():
    path=ROOT/'model'/'tongue_pixels_v2'/'classifier.joblib'
    if not path.is_file():raise HTTPException(503,'Chưa có mô hình thè lưỡi đã huấn luyện.')
    bundle=joblib.load(path)
    if bundle.get('schema')!=SCHEMA:raise HTTPException(503,'Mô hình thè lưỡi không đúng phiên bản dữ liệu.')
    return bundle['model']

@router.post('/predict')
def predict(payload:PredictionInput):
    if payload.schema_id!=SCHEMA['schema_id'] or any(v<0 or v>1 for v in payload.values):
        raise HTTPException(422,'Sai định dạng pixel vùng miệng.')
    model=trained_model()
    probabilities=model.predict_proba([payload.values])[0]
    return {'scores':dict(zip(model.classes_.tolist(),probabilities.tolist()))}
