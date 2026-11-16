import {test} from 'node:test'
import assert from 'node:assert/strict'
import {extractGestureFeatures,featureSchema} from '../src/services/gestureFeatures.ts'
function observation(){const face=Array.from({length:478},()=>({x:.5,y:.4,z:0}));face[234]={x:.34,y:.4,z:0};face[454]={x:.66,y:.4,z:0};face[10]={x:.5,y:.15,z:0};face[152]={x:.5,y:.65,z:0};face[33]={x:.4,y:.32,z:0};face[263]={x:.6,y:.32,z:0};return {face,hands:[],blend:{jawOpen:.2},width:640,height:480}}
test('feature count, finite values and missing-hand masks',()=>{const x=extractGestureFeatures(observation());assert.equal(x.length,featureSchema.dimension);assert.ok(x.every(Number.isFinite));assert.equal(x[18],0);assert.equal(x[85],0)})
test('missing face produces no training sample',()=>assert.equal(extractGestureFeatures({...observation(),face:[]}),null))
test('face translation does not become a class signal',()=>{const o=observation();const moved={...o,face:o.face.map(p=>({...p,x:p.x+.05,y:p.y+.05}))};const a=extractGestureFeatures(o),b=extractGestureFeatures(moved);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8))})
test('eye calibration does not change classifier feature extraction',()=>{const o=observation();assert.deepEqual(extractGestureFeatures(o),extractGestureFeatures({...o,eyeBaseline:{left:.1,right:.1}}))})
