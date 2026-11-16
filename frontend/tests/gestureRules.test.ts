import {test} from 'node:test'
import assert from 'node:assert/strict'
import {matchGestures,GestureHold} from '../src/services/gestureRules.ts'
const point=(x=.5,y=.4)=>({x,y})
function fixture(){
 const face=Array.from({length:478},()=>point())
 face[234]=point(.34,.4);face[454]=point(.66,.4);face[1]=point(.5,.4)
 face[10]=point(.5,.15);face[152]=point(.5,.65);face[33]=point(.4,.32);face[263]=point(.6,.32)
 return {face,hands:[],blend:{},width:640,height:480}
}
function hand(x,y,open){
 const h=Array.from({length:21},()=>point(x,y));h[0]=point(x,y+.09)
 for(const [j,dx] of [[5,-.03],[9,0],[13,.03],[17,.05]]){
 h[j]=point(x+dx,y);h[j+1]=point(x+dx,y-.04);h[j+2]=point(x+dx,y-.07);h[j+3]=point(x+dx,open?y-.12:y+.03)
 }return h
}
test('no face and neutral never force a meme',()=>{
 assert.deepEqual(matchGestures({...fixture(),face:[]}).ids,[])
 assert.deepEqual(matchGestures(fixture()).ids,[])
})
test('seven distinct synthetic poses map to their designated meme',()=>{
 const cases=[
 ['angry_02',[hand(.3,.8,false),hand(.7,.8,false)],{},false],
 ['angry_05',[hand(.3,.45,false)],{},false],
 ['surprise_04',[],{jawOpen:.8,eyeWideLeft:.3,eyeWideRight:.3},false],
 ['happy_03',[hand(.2,.1,true)],{jawOpen:.3},false],
 ['happy_04',[hand(.3,.45,true),hand(.7,.45,true)],{eyeBlinkLeft:.8,eyeBlinkRight:.8},false],
 ['sad_04',[hand(.3,.45,true)],{},true],
 ['sad_05',[hand(.46,.8,true),hand(.54,.8,true)],{},false],
 ]
 for(const [id,hands,blend,tilt] of cases){const f=fixture();if(tilt)f.face[263]=point(.6,.4);assert.deepEqual(matchGestures({...f,hands,blend}).ids,[id],id)}
})
test('hold requires duration and samples, resets on missing or ambiguous data',()=>{
 const h=new GestureHold()
 assert.equal(h.update(['angry_02'],0).stable,false)
 assert.equal(h.update(['angry_02'],1000).stable,false)
 assert.equal(h.update(['angry_02'],1100).stable,false)
 assert.equal(h.update(['angry_02'],1200).stable,true)
 assert.equal(h.update(['angry_02','sad_05'],1300).id,null)
 assert.equal(h.update(['angry_02'],1400).stable,false)
 assert.equal(h.update([],1500).id,null)
 assert.equal(h.update(['angry_02'],1600).progress,0)
})
test('tracking gap and different gesture reset stability',()=>{
 const h=new GestureHold()
 for(const t of [0,250,500,750])h.update(['happy_03'],t)
 assert.equal(h.update(['happy_03'],800).stable,true)
 assert.equal(h.update(['happy_03'],3000).stable,false)
 assert.equal(h.update(['sad_04'],3100).progress,0)
})

function eyesFixture(gap){
 const f=fixture()
 f.face[133]=point(.46,.32);f.face[362]=point(.54,.32)
 f.face[159]=point(.43,.32-gap/2);f.face[145]=point(.43,.32+gap/2)
 f.face[386]=point(.57,.32-gap/2);f.face[374]=point(.57,.32+gap/2)
 return f
}
test('surprise accepts naturally narrow open eyes without eyeWide scores',()=>{
 const f=eyesFixture(.004)
 assert.deepEqual(matchGestures({...f,eyeBaseline:{left:.05,right:.05},blend:{jawOpen:.3,eyeBlinkLeft:.8,eyeBlinkRight:.8}}).ids,['surprise_04'])
 const wider=eyesFixture(.012)
 assert.deepEqual(matchGestures({...wider,eyeBaseline:{left:.15,right:.15},blend:{jawOpen:.3}}).ids,['surprise_04'])
})
test('calibrated closed eyes, closed mouth and strong smile do not trigger surprise',()=>{
 assert.deepEqual(matchGestures({...eyesFixture(.0005),eyeBaseline:{left:.05,right:.05},blend:{jawOpen:.3}}).ids,[])
 assert.deepEqual(matchGestures({...eyesFixture(.004),eyeBaseline:{left:.05,right:.05},blend:{jawOpen:.03}}).ids,[])
 assert.deepEqual(matchGestures({...eyesFixture(.004),eyeBaseline:{left:.05,right:.05},blend:{jawOpen:.4,mouthSmileLeft:.8,mouthSmileRight:.8}}).ids,[])
})
test('uncalibrated natural eyes need no forced widening; explicit closed eyes are rejected',()=>{
 assert.deepEqual(matchGestures({...eyesFixture(.004),blend:{jawOpen:.3,eyeWideLeft:0,eyeWideRight:0}}).ids,['surprise_04'])
 assert.deepEqual(matchGestures({...eyesFixture(.004),blend:{jawOpen:.3,eyeBlinkLeft:.9,eyeBlinkRight:.9}}).ids,[])
})
