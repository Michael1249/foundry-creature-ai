import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAttackPath, clearSightPath, footprintRayPoints, footprintVisibility } from '../src/foundry/attack-path.mjs';

function fixture() {
  const rays=[],surfaces=[];
  const scene={grid:{distance:5},testSurfaceCollision:(origin,destination,options)=>{surfaces.push({origin,destination,...options});return false;}};
  const token=(x,depth)=>{
    const document={x,y:0,elevation:10,depth,level:'ground',parent:scene};
    document.getMovementOrigin=()=>({x:x+50,y:50,elevation:10+depth*2.5});
    document.getVisionOrigin=()=>({x:x+50,y:50,elevation:11+depth*2.5});
    return {document,center:{x:x+50,y:50},checkCollision:(destination,options)=>{rays.push({destination,...options});return false;}};
  };
  return {scene,rays,surfaces,attacker:token(0,2),target:token(200,1)};
}

test('attack and sight rays use each token’s native height instead of a two-dimensional center',()=>{
  const f=fixture();
  assert.equal(clearAttackPath(f.attacker,f.target),true);
  assert.equal(clearSightPath(f.attacker,f.target),true);
  assert.ok(f.rays.slice(0,4).every(ray=>ray.origin.elevation===15&&ray.destination.elevation===12.5));
  assert.ok(f.rays.slice(4).every(ray=>ray.origin.elevation===16&&ray.destination.elevation===13.5));
  assert.deepEqual([...new Set(f.surfaces.map(ray=>`${ray.type}:${ray.level}`))],['move:ground','sight:ground']);
});

test('lookahead changes the ray’s horizontal origin while retaining native height',()=>{
  const f=fixture();
  clearSightPath(f.attacker,f.target,{x:450,y:350});
  assert.deepEqual([...new Set(f.rays.map(ray=>ray.origin.x))],[405]);
  assert.deepEqual([...new Set(f.rays.map(ray=>ray.origin.y))],[305]);
  assert.ok(f.rays.every(ray=>ray.origin.elevation===16));
});

test('a floor below both ray endpoints does not block them, while a crossed surface does',()=>{
  const f=fixture();let plane=10;
  f.scene.testSurfaceCollision=(a,b)=>Math.min(a.elevation,b.elevation)<plane&&Math.max(a.elevation,b.elevation)>=plane;
  assert.equal(clearAttackPath(f.attacker,f.target),true);
  assert.equal(clearSightPath(f.attacker,f.target),true);
  plane=14;
  assert.equal(clearAttackPath(f.attacker,f.target),false);
  assert.equal(clearSightPath(f.attacker,f.target),false);
});

test('transparent walls can still block an attack independently of sight',()=>{
  const f=fixture();f.attacker.checkCollision=(_destination,{type})=>type==='move';
  assert.equal(clearSightPath(f.attacker,f.target),true);
  assert.equal(clearAttackPath(f.attacker,f.target),false);
});

test('footprint rays start inside token edges so an adjacent grid wall does not cover its own corners',()=>{
  const f=fixture();f.scene.grid.size=100;
  assert.deepEqual(footprintRayPoints(f.attacker).map(({x,y})=>[x,y]),[[5,5],[5,95],[95,5],[95,95]]);
  const crosses=wall=>(destination,{origin})=>(origin.x-wall)*(destination.x-wall)<=0;
  f.attacker.checkCollision=crosses(0);
  assert.equal(footprintVisibility(f.attacker,f.target).unobstructed,true,'a wall touching the observer edge is outside every inset ray');
  f.attacker.checkCollision=crosses(150);
  assert.equal(footprintVisibility(f.attacker,f.target).visible,false,'an intervening wall still blocks every inset ray');
});

test('Large footprints preserve internal samples while moving boundary samples inward by 0.05 grid units',()=>{
  const f=fixture();f.scene.grid.size=100;f.attacker.document.width=2;f.attacker.document.height=2;
  assert.deepEqual([...new Set(footprintRayPoints(f.attacker).map(point=>point.x))],[5,100,195]);
  assert.deepEqual([...new Set(footprintRayPoints(f.attacker).map(point=>point.y))],[5,100,195]);
});

test('one observer intersection must see the whole target to remove corner obstruction',()=>{
  const f=fixture();f.target.document.width=2;f.target.document.height=2;
  const visible=new Set(['205,5','300,5','395,5']);
  f.attacker.checkCollision=destination=>!visible.has(`${destination.x},${destination.y}`);
  let result=footprintVisibility(f.attacker,f.target);
  assert.deepEqual({visible:result.visible,points:result.visiblePoints,total:result.totalPoints,cover:result.coverBonus},
    {visible:true,points:3,total:9,cover:1});
  visible.clear();visible.add('205,5');result=footprintVisibility(f.attacker,f.target);
  assert.equal(result.coverBonus,2,'one visible target intersection grants standard cover');
  visible.add('300,5');visible.add('395,5');visible.add('205,100');visible.add('300,100');
  result=footprintVisibility(f.attacker,f.target);assert.equal(result.coverBonus,1,'every partial view beyond one point grants lesser cover');
});

test('a Medium target receives lesser cover whenever more than one but fewer than all corners are visible',()=>{
  const f=fixture(),visible=new Set(['205,5','295,5']);
  f.attacker.checkCollision=destination=>!visible.has(`${destination.x},${destination.y}`);
  let result=footprintVisibility(f.attacker,f.target);
  assert.equal(result.totalPoints,4);assert.equal(result.visiblePoints,2);assert.equal(result.coverBonus,1);
  visible.add('205,95');result=footprintVisibility(f.attacker,f.target);
  assert.equal(result.visiblePoints,3);assert.equal(result.coverBonus,1,'three of four visible corners still grant lesser cover');
  visible.add('295,95');result=footprintVisibility(f.attacker,f.target);
  assert.equal(result.visiblePoints,4);assert.equal(result.coverBonus,0,'all visible corners remove wall cover');
});

test('rays visible from different observer corners do not combine into an unobstructed view',()=>{
  const f=fixture(),origins=new Map([['5,5','205,5'],['5,95','295,5'],['95,5','205,95'],['95,95','295,95']]);
  f.attacker.checkCollision=(destination,{origin})=>origins.get(`${origin.x},${origin.y}`)!==`${destination.x},${destination.y}`;
  const result=footprintVisibility(f.attacker,f.target);
  assert.equal(result.visible,true);assert.equal(result.unobstructed,false);assert.equal(result.visiblePoints,1);assert.equal(result.coverBonus,2);
});
