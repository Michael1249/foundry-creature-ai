import {clearLevelWalls} from './vertical-space.mjs';
import {flySpeed} from './flight-costs.mjs';
import {pitBlocksRay} from './pit-geometry.mjs';
import {iceBlocksRay} from './ice-wall-geometry.mjs';
// Token.center is only 2D in Foundry 14. Use each token's own native ray height,
// including for a target of a different depth and hypothetical movement origins.
export function tokenRayPoint(token, type = 'move', center) {
  const document = token.document, source = document._source ?? document;
  const method = type === 'sight' ? document.getVisionOrigin : document.getMovementOrigin;
  const native = method?.call(document, source);
  const distance = document.parent?.grid?.distance ?? globalThis.canvas?.grid?.distance ?? 5;
  const point = native ?? { ...token.center, elevation: (source.elevation ?? 0) + (source.depth ?? 1) * distance / 2 };
  return { x: center?.x ?? point.x, y: center?.y ?? point.y, elevation: center?.elevation ?? point.elevation };
}

function clearRay(attacker, target, type, origin, destination) {
  if(pitBlocksRay(attacker,target,origin,destination))return false;
  if(iceBlocksRay(attacker.document.parent,origin,destination,attacker.document.level))return false;
  const across=flySpeed(attacker.actor)>0||flySpeed(target.actor)>0;
  if(across&&globalThis.CONFIG?.Canvas?.polygonBackends?.[type]?.testCollision){
    if(!clearLevelWalls(attacker,origin,destination,type))return false;
  }else if(attacker.checkCollision?.(destination,{origin,type,mode:'any'}))return false;
  // Token.checkCollision tests wall edges. Foundry tests horizontal surfaces
  // separately. Flyers test physical surfaces across the scene's levels.
  return !attacker.document.parent?.testSurfaceCollision?.(origin, destination,
    { type, mode: 'any', level: across?undefined:attacker.document.level });
}

function footprintAxis(start,length,step){
  const end=start+length,points=[start];
  if(step>0)for(let value=start+step;value<end-1e-6;value+=step)points.push(value);
  if(end!==start)points.push(end);return points;
}

// Sample every occupied-grid intersection. Medium and smaller creatures have
// four footprint corners; larger creatures also contribute their internal grid
// intersections, as required by the table's corner-visibility policy.
export function footprintRayPoints(token,type='sight',center){
  const document=token.document,source=document._source??document,scene=document.parent??globalThis.canvas?.scene;
  const size=scene?.grid?.size??globalThis.canvas?.grid?.size??100;
  const widthUnits=Number.isFinite(document.width)?document.width:Number.isFinite(token.w)?token.w/size:1,
    heightUnits=Number.isFinite(document.height)?document.height:Number.isFinite(token.h)?token.h/size:1;
  const width=widthUnits*size,height=heightUnits*size;
  const native=tokenRayPoint(token,type,center),left=center?center.x-width/2:source.x??token.center.x-width/2,
    top=center?center.y-height/2:source.y??token.center.y-height/2;
  return footprintAxis(left,width,size).flatMap(x=>footprintAxis(top,height,size).map(y=>({x,y,elevation:native.elevation})));
}

export function footprintVisibility(observer,target,{type='sight',origin,destination}={}){
  const origins=footprintRayPoints(observer,type,origin),targets=footprintRayPoints(target,type,destination);
  let visible=0;
  for(const from of origins){
    let count=0;
    for(const to of targets)if(clearRay(observer,target,type,from,to))count++;
    if(count===targets.length)return {visible:true,unobstructed:true,visiblePoints:count,totalPoints:targets.length,coverBonus:0};
    visible=Math.max(visible,count);
  }
  if(!visible)return {visible:false,unobstructed:false,visiblePoints:0,totalPoints:targets.length,coverBonus:0};
  const coverBonus=visible===1?4:visible*2<targets.length?2:0;
  return {visible:true,unobstructed:false,visiblePoints:visible,totalPoints:targets.length,coverBonus};
}

// Glass can permit sight while blocking weapons. Keep both native collision
// types distinct while using the same footprint-corner policy.
export const clearAttackPath = (attacker, target, origin) => footprintVisibility(attacker,target,{type:'move',origin}).visible;
export const clearSightPath = (attacker, target, origin) => footprintVisibility(attacker,target,{type:'sight',origin}).visible;
