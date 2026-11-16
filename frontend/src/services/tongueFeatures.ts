import type {Point} from './gestureRules'
export function mouthRegion(face:Point[],width:number,height:number){
 if(face.length<468)return null
 const mouthWidth=Math.abs(face[291].x-face[61].x)*width
 if(mouthWidth<20)return null
 const x=Math.max(0,Math.min(face[61].x,face[291].x)*width-mouthWidth*.12)
 const y=Math.max(0,Math.min(face[0].y,face[13].y)*height-mouthWidth*.08)
 const right=Math.min(width,Math.max(face[61].x,face[291].x)*width+mouthWidth*.12)
 const bottom=Math.min(height,face[152].y*height,Math.max(face[17].y,face[14].y)*height+mouthWidth*.35)
 return right-x>=20&&bottom-y>=10?{x,y,width:right-x,height:bottom-y}:null
}
export function mouthColorFeatures(rgba:Uint8ClampedArray,width=48,height=32):number[]|null{
 if(width%4||height%4||rgba.length!==width*height*4)return null
 const output:number[]=[]
 for(let gy=0;gy<4;gy++)for(let gx=0;gx<4;gx++){
   let r=0,g=0,b=0,red=0,count=0
   for(let y=gy*height/4;y<(gy+1)*height/4;y++)for(let x=gx*width/4;x<(gx+1)*width/4;x++){
     const i=(y*width+x)*4;r+=rgba[i];g+=rgba[i+1];b+=rgba[i+2];count++
     if(rgba[i]>rgba[i+1]*1.15&&rgba[i]>rgba[i+2]*1.05)red++
   }
   const sum=r+g+b
   output.push(sum?r/sum:0,sum?g/sum:0,sum?b/sum:0,red/count)
 }
 return output
}

// Preserve spatial RGB detail. These values encode an image, not anonymous statistics.
export function mouthPixelFeatures(rgba:Uint8ClampedArray):number[]|null{
 if(rgba.length!==48*32*4)return null
 const values:number[]=[]
 for(let i=0;i<rgba.length;i+=4)values.push(rgba[i]/255,rgba[i+1]/255,rgba[i+2]/255)
 return values
}
