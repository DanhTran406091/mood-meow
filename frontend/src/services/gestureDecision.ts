import type {Signals,Point} from './gestureRules.ts'
type Sample={signals:Signals;landmarks:{face:Point[];hands:Point[][];width:number;height:number}}
export function trainedGestureAllowed(id:string,sample:Sample):boolean{
 if(!sample.signals.face)return false
 if(id!=='angry_03')return true
 const {signals,landmarks}=sample
 if(signals.jaw<.25||signals.hands!==2||signals.fists!==2)return false
 const f=landmarks.face
 if(f.length<468||landmarks.hands.some(h=>h.length<21))return false
 const fh=Math.abs(f[152].y-f[10].y),fw=Math.abs(f[454].x-f[234].x)
 if(fh<=0||fw<=0)return false
 const centers=landmarks.hands.map(h=>h[9])
 return centers.every(h=>h.y>=f[1].y-fh*.2&&h.y<=f[152].y+fh*.7)
   &&Math.abs(centers[0].x-centers[1].x)>fw*1.2
}
export function mergeGestureIds(ruleIds:string[],trainedId:string|null,trainedLabels:string[],sample:Sample):string[]{
 const fallback=ruleIds.filter(id=>!trainedLabels.includes(id))
 if(trainedId&&trainedGestureAllowed(trainedId,sample))return [trainedId]
 // angry_02 has a closed-mouth reference; do not mistake an incomplete
 // open-mouth angry_03 attempt for this old rule.
 return fallback.filter(id=>id!=='angry_02'||sample.signals.jaw<.18)
}
