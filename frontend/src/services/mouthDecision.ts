// Scores are classifier outputs, not calibrated certainty. Conservatively
// reject ambiguous mouth-only frames rather than swapping surprise/tongue.
export class MouthDecision{
 private scores:number[]=[]
 reset(){this.scores=[]}
 update(tongue:number,open:number){
  if(!Number.isFinite(tongue)||!Number.isFinite(open)||tongue<0||open<0||tongue>1||open>1){this.reset();return null}
  this.scores.push(tongue);this.scores=this.scores.slice(-5)
  if(this.scores.length<5)return null
  const mean=this.scores.reduce((a,b)=>a+b,0)/5
  if(mean>=.85&&this.scores.filter(s=>s>=.80).length>=4)return 'tongue'
  if(mean<=.30&&this.scores.filter(s=>s<=.40).length>=4)return 'open'
  return null
 }
}
