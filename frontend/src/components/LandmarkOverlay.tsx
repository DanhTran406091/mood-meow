import type {Point} from '../services/gestureRules'

type Landmarks={face:Point[];hands:Point[][];width:number;height:number}
// Face outline, eyes, eyebrows, mouth and nose. Not a dense face mesh.
const facePaths=[
 [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],
 [33,160,158,133,153,144,33], [263,387,385,362,380,373,263],
 [70,63,105,66,107],[336,296,334,293,300],
 [61,40,37,0,267,270,291,321,314,17,84,91,61],
 [78,81,13,311,308,402,14,178,78], [168,6,197,195,5,4,1],
]
const handPaths=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]]
const valid=(p:Point|undefined):p is Point=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
export function LandmarkOverlay({landmarks}:{landmarks:Landmarks|null}){
 if(!landmarks||landmarks.width<=0||landmarks.height<=0)return null
 const {face,hands,width,height}=landmarks
 const draw=(points:Point[],paths:number[][],color:string,prefix:string)=>{
  const visible=Array.from(new Set(paths.flat())).filter(i=>valid(points[i]))
  return <g key={prefix} stroke={color}>
   {paths.map((indices,i)=>indices.every(n=>valid(points[n]))?<polyline key={i} points={indices.map(n=>`${points[n].x*width},${points[n].y*height}`).join(' ')} fill="none" strokeWidth={prefix==='face'?1.1:2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>:null)}
   {visible.map(i=><circle key={i} cx={points[i].x*width} cy={points[i].y*height} r={width*(prefix==='face'?.0018:.004)} fill={color} stroke="none"/>)}
  </g>
 }
 return <svg className="landmark-overlay" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  {face.length>0&&draw(face,facePaths,'#75f0d6','face')}
  {hands.map((hand,i)=>draw(hand,handPaths,i===0?'#ffcf70':'#a9baff',`hand-${i}`))}
 </svg>
}
