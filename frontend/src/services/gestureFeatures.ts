import schema from '../config/gestureFeatures.json' with {type:'json'}
import {measureEyes} from './gestureRules.ts'
import type {Observation,Point} from './gestureRules.ts'
export {schema as featureSchema}
export function extractGestureFeatures(input:Observation):number[]|null {
 if(input.face.length<468)return null
 const point=(p:Point)=>({x:p.x*input.width,y:p.y*input.height,z:(p.z??0)*input.width})
 const f=input.face.map(point)
 const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)
 const fw=dist(f[234],f[454]),fh=dist(f[10],f[152])
 if(fw<65||fh<70)return null
 const eyes=measureEyes(input)
 if(!eyes)return null
 const roll=Math.atan2(f[263].y-f[33].y,Math.abs(f[263].x-f[33].x))
 const values:number[]=schema.blend_names.map(name=>input.blend[name]??0)
 values.push(eyes.left,eyes.right,dist(f[13],f[14])/fw,dist(f[61],f[291])/fw,Math.sin(roll),Math.cos(roll))
 // Image-left to image-right slots, identical during collection and prediction.
 const hands=input.hands.filter(h=>h.length===21).map(h=>h.map(point)).sort((a,b)=>a[9].x-b[9].x)
 for(let i=0;i<2;i++){
   const hand=hands[i]
   if(!hand){values.push(...Array(67).fill(0));continue}
   const palm=dist(hand[0],hand[9])
   if(palm<3)return null
   values.push(1,(hand[9].x-f[1].x)/fw,(hand[9].y-f[1].y)/fw,palm/fw)
   for(const p of hand)values.push((p.x-hand[0].x)/palm,(p.y-hand[0].y)/palm,(p.z-hand[0].z)/palm)
 }
 if(values.length!==schema.dimension||!values.every(Number.isFinite))return null
 return values.map(v=>Math.max(-8,Math.min(8,v)))
}
