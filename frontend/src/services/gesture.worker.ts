/// <reference lib="webworker" />
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { matchGestures, GestureHold, measureEyes } from './gestureRules'
import {mouthRegion,mouthPixelFeatures} from './tongueFeatures'
import {extractGestureFeatures,featureSchema} from './gestureFeatures'
import type {EyeBaseline} from './gestureRules'
let face:FaceLandmarker|null=null
let hands:HandLandmarker|null=null
let hold=new GestureHold()
let eyeBaseline:EyeBaseline|null=null
let calibration:'idle'|'collecting'|'ready'|'failed'='idle'
let calibrationSince:number|null=null
let eyeSamples:EyeBaseline[]=[]
const mouthCanvas=new OffscreenCanvas(48,32)
const mouthContext=mouthCanvas.getContext('2d',{willReadFrequently:true})
self.onmessage=async(event:MessageEvent)=>{
  const data=event.data
  if(data.type==='init') {
    try {
      const vision=await FilesetResolver.forVisionTasks(`${data.origin}/mediapipe`, true)
      face=await FaceLandmarker.createFromOptions({...vision,wasmLoaderPath:vision.wasmLoaderPath+'?task=face'},{baseOptions:{modelAssetPath:`${data.origin}/models/face_landmarker.task`,delegate:'CPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true})
      hands=await HandLandmarker.createFromOptions({...vision,wasmLoaderPath:vision.wasmLoaderPath+'?task=hands'},{baseOptions:{modelAssetPath:`${data.origin}/models/hand_landmarker.task`,delegate:'CPU'},runningMode:'VIDEO',numHands:2})
      self.postMessage({type:'ready'})
    } catch(error) {face?.close();hands?.close();self.postMessage({type:'error',message:String(error)})}
  }
  if(data.type==='calibrate-eyes') {
    calibration='collecting';calibrationSince=null;eyeSamples=[];hold=new GestureHold()
  }
  if(data.type==='frame') {
    const bitmap=data.bitmap as ImageBitmap
    try {
      if(!face||!hands) throw new Error('Bộ theo dõi chưa sẵn sàng')
      const f=face.detectForVideo(bitmap,data.timestamp)
      const h=hands.detectForVideo(bitmap,data.timestamp)
      const blend=Object.fromEntries((f.faceBlendshapes[0]?.categories??[]).map(c=>[c.categoryName,c.score]))
      const observation={face:f.faceLandmarks[0]??[],hands:h.landmarks,blend,width:bitmap.width,height:bitmap.height,eyeBaseline}
      if(calibration==='collecting') {
        calibrationSince??=data.timestamp
        const elapsed=data.timestamp-(calibrationSince??data.timestamp)
        const eyes=measureEyes(observation)
        if(eyes&&eyes.left>.005&&eyes.right>.005)eyeSamples.push(eyes)
        if(eyeSamples.length>=10&&elapsed>=1500) {
          const median=(values:number[])=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]
          eyeBaseline={left:median(eyeSamples.map(e=>e.left)),right:median(eyeSamples.map(e=>e.right))}
          observation.eyeBaseline=eyeBaseline;calibration='ready';eyeSamples=[];hold=new GestureHold()
        } else if(elapsed>10000){calibration='failed';eyeSamples=[]}
      }
      let tongueFeatures:number[]|null=null
      let mouthPreview:Uint8ClampedArray|null=null
      const roi=mouthRegion(observation.face,bitmap.width,bitmap.height)
      if(roi&&mouthContext){
        mouthContext.drawImage(bitmap,roi.x,roi.y,roi.width,roi.height,0,0,48,32)
        mouthPreview=mouthContext.getImageData(0,0,48,32).data
        tongueFeatures=mouthPixelFeatures(mouthPreview)
      }
      const features=extractGestureFeatures(observation)
      const combinedFeatures=features&&tongueFeatures?[...features,...tongueFeatures]:null
      const match=matchGestures(observation)
      if(calibration==='collecting')match.ids=[]
      self.postMessage({type:'result',combinedFeatures,mouthPreview,tongueFeatures,features,schemaId:featureSchema.schema_id,timestamp:data.timestamp,calibration,eyeBaseline,...match,...hold.update(match.ids,data.timestamp),landmarks:{face:f.faceLandmarks[0]??[],hands:h.landmarks,width:data.sourceWidth??bitmap.width,height:data.sourceHeight??bitmap.height}})
    } catch(error) {self.postMessage({type:'error',message:String(error)})}
    finally {bitmap.close()}
  }
}
