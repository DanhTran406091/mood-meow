import json
from argparse import Namespace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase,main
from uuid import uuid4
from pydantic import ValidationError
from gesture_ml.dataset import Clip,SCHEMA,save_clip,summary
from gesture_ml.train import partition,run

class TrainingTests(TestCase):
 def payload(self):
  return dict(clip_id=str(uuid4()),subject='P01',session='S01',label='none',schema_id=SCHEMA['schema_id'],frames=[dict(t_ms=i*400,values=[0.0]*SCHEMA['dimension']) for i in range(8)])
 def test_save_idempotent_and_summary(self):
  with TemporaryDirectory() as tmp:
   directory=Path(tmp);clip=Clip.model_validate(self.payload())
   self.assertFalse(save_clip(clip,directory)['duplicate'])
   self.assertTrue(save_clip(clip,directory)['duplicate'])
   self.assertEqual(summary(directory)['clips'],1)
 def test_reject_invalid_schema_nan_and_paths(self):
  for key,value in [('schema_id','wrong'),('subject','../escape'),('label','fake')]:
   data=self.payload();data[key]=value
   with self.assertRaises(ValidationError):Clip.model_validate(data)
  data=self.payload();data['frames'][0]['values'][0]=float('nan')
  with self.assertRaises(ValidationError):Clip.model_validate(data)
 def test_group_separation(self):
  records=[dict(subject=p,session='S01',label=l,clip_id=str(uuid4())) for p in ['P01','P02','P03','P04','P05'] for l in SCHEMA['labels']]
  tr,val,te,groups=partition(records,'subject')
  self.assertFalse(set(groups[tr])&set(groups[te]));self.assertFalse(set(groups[tr])&set(groups[val]));self.assertFalse(set(groups[val])&set(groups[te]))
 def test_empty_data_creates_no_model(self):
  with TemporaryDirectory() as tmp:
   out=Path(tmp)/'model'
   with self.assertRaises(ValueError):run(Namespace(data=Path(tmp),out=out,split_by='subject'))
   self.assertFalse(out.exists())
 def test_frontend_backend_same_schema(self):
  frontend=Path(__file__).resolve().parents[2]/'frontend/src/config/gestureFeatures.json'
  self.assertEqual(json.loads(frontend.read_text()),SCHEMA)

if __name__=='__main__':main()
