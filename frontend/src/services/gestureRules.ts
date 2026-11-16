export type Point = { x: number; y: number; z?: number }
export type EyeBaseline = {left:number;right:number}
export type Observation = {eyeBaseline?:EyeBaseline|null; face: Point[]; hands: Point[][]; blend: Record<string, number>; width: number; height: number }
export type Signals = { face: boolean; hands: number; openHands: number; fists: number; jaw: number; eyesClosed: boolean; roll: number }
export type Match = { ids: string[]; signals: Signals }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
function extendedCount(hand: Point[]) {
  let count = 0
  for (const base of [5, 9, 13, 17]) {
    const a = hand[base], b = hand[base + 1], c = hand[base + 3]
    const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y }
    const denom = Math.hypot(u.x,u.y) * Math.hypot(v.x,v.y)
    const cosine = denom > 1e-6 ? (u.x*v.x + u.y*v.y)/denom : 1
    if (cosine < -.82 && distance(c,hand[0]) > distance(b,hand[0]) * 1.08) count++
  }
  return count
}
export function measureEyes(input: Observation): EyeBaseline|null {
  if(input.face.length<468)return null
  const px=(i:number)=>({x:input.face[i].x*input.width,y:input.face[i].y*input.height})
  const lw=distance(px(33),px(133)),rw=distance(px(263),px(362))
  if(lw<1||rw<1)return null
  const left=distance(px(159),px(145))/lw,right=distance(px(386),px(374))/rw
  return Number.isFinite(left)&&Number.isFinite(right)?{left,right}:null
}
export function matchGestures(input: Observation): Match {
  const signals: Signals = { face: false, hands: input.hands.length, openHands: 0, fists: 0, jaw: input.blend.jawOpen ?? 0, eyesClosed: false, roll: 0 }
  if (input.face.length < 468 || input.width <= 0 || input.height <= 0) return { ids: [], signals }
  const pixel = (p: Point): Point => ({ x: p.x*input.width, y:p.y*input.height })
  const face = input.face.map(pixel)
  const left=face[234], right=face[454], nose=face[1], top=face[10], chin=face[152]
  const fw=distance(left,right), fh=distance(top,chin)
  if (fw<65 || fh<70) return {ids:[],signals}
  signals.face=true
  const hands=input.hands.filter(h=>h.length===21).map(h=>{
    const pts=h.map(pixel), fingers=extendedCount(pts)
    return {pts, center:pts[9], open:fingers>=3, fist:fingers<=1}
  })
  signals.hands=hands.length
  signals.openHands=hands.filter(h=>h.open).length
  signals.fists=hands.filter(h=>h.fist).length
  const roll=Math.atan2(face[263].y-face[33].y, Math.abs(face[263].x-face[33].x))
  signals.roll=roll
  signals.eyesClosed=(input.blend.eyeBlinkLeft??0)>.5 && (input.blend.eyeBlinkRight??0)>.5
  const nearCheek=(h:typeof hands[number])=>Math.min(distance(h.center,left),distance(h.center,right))<fw*.65 && Math.abs(h.center.x-nose.x)>fw*.28 && h.center.y>top.y+fh*.2 && h.center.y<chin.y+fh*.15
  const belowFace=(h:typeof hands[number])=>h.center.y>chin.y-fh*.05 && h.center.y<chin.y+fh*1.5 && Math.abs(h.center.x-nose.x)<fw*1.6
  const ids:string[]=[]
  if(hands.length===2 && hands.every(h=>h.fist&&belowFace(h)) && distance(hands[0].center,hands[1].center)>fw*.6) ids.push('angry_02')
  if(hands.length===1 && hands[0].fist && nearCheek(hands[0])) ids.push('angry_05')
  // Surprise does not require wide eyes or an open-eye ratio threshold.
  const eyes=measureEyes(input)
  const eyesOpen=input.eyeBaseline&&eyes?eyes.left>=input.eyeBaseline.left*.35&&eyes.right>=input.eyeBaseline.right*.35:!signals.eyesClosed
  const lipWidth=distance(face[61],face[291])
  const lipOpening=lipWidth>0?distance(face[13],face[14])/lipWidth:0
  const smile=((input.blend.mouthSmileLeft??0)+(input.blend.mouthSmileRight??0))/2
  if(hands.length===0 && (signals.jaw>.15||(signals.jaw>.06&&lipOpening>.12)) && eyesOpen && smile<.45) ids.push('surprise_04')
  if(hands.length===1 && hands[0].open && hands[0].center.y<top.y+fh*.2 && (signals.jaw>.2 || ((input.blend.mouthSmileLeft??0)+(input.blend.mouthSmileRight??0))/2>.35)) ids.push('happy_03')
  if(hands.length===2 && hands.every(h=>h.open&&nearCheek(h)) && (hands[0].center.x-nose.x)*(hands[1].center.x-nose.x)<0 && signals.eyesClosed) ids.push('happy_04')
  if(hands.length===1 && hands[0].open && nearCheek(hands[0]) && Math.abs(roll)>.14 && !signals.eyesClosed) ids.push('sad_04')
  if(hands.length===2 && hands.every(h=>!h.fist&&belowFace(h)&&h.pts[8].y<h.pts[0].y) && distance(hands[0].center,hands[1].center)<fw*.65 && distance(hands[0].pts[8],hands[1].pts[8])<fw*.55) ids.push('sad_05')
  return {ids,signals}
}
export class GestureHold {
  private id:string|null=null
  private since=0
  private last=-Infinity
  private samples=0
  update(ids:string[],now:number) {
    const id=ids.length===1?ids[0]:null
    if(id===null) {this.id=null;this.samples=0;this.last=now;return {id:null,progress:0,stable:false}}
    if(id!==this.id || now-this.last>1500 || now<this.last) {this.id=id;this.since=now;this.samples=0}
    this.last=now;this.samples++
    const progress=Math.min(1,(now-this.since)/700,this.samples/4)
    return {id,progress,stable:progress>=1}
  }
}
