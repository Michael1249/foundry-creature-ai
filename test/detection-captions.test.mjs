import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/ogre-fixture.mjs';
import { captionDetection, defenseLabel, EnvironmentAwareness } from '../src/foundry/environment-awareness.mjs';
import {captionRenderer} from './helpers/caption-renderer.mjs';

const ns='foundry-creature-ai';
function setup() {
  const f=fixture({footprint:1});
  const setStealth=state=>f.flags.set(`token-fighter:${ns}:stealth`,{combatId:f.combat.id,sceneId:'scene',moving:true,
    entries:[{observerId:f.boss.id,state,knownPosition:{x:500,y:200,elevation:0,level:'ground'}}]});
  return {...f,setStealth};
}

test('stealth captions distinguish Hidden and Undetected relative to the selected observer',()=>{
  const f=setup(),environment={coverBonus:2,concealed:true};f.setStealth('hidden');
  let detection=captionDetection(f.boss,f.player);
  assert.equal(detection.state,'hidden');assert.deepEqual(detection.causes,['stealth']);assert.equal(detection.diagnosticOnly,false);
  assert.equal(defenseLabel(environment,detection),'Cover +2\nConcealed\nHidden (stealth)');
  f.setStealth('undetected');detection=captionDetection(f.boss,f.player);
  assert.equal(defenseLabel({coverBonus:0,concealed:false},detection),'Undetected (stealth)');
  assert.equal(captionDetection(f.player,f.boss).state,'observed');
});

test('invisibility and blocked LOS are separate, combinable diagnostic causes without condition writes',()=>{
  const f=setup();f.player.actor.conditionsSet.add('invisible');
  let detection=captionDetection(f.boss,f.player);
  assert.deepEqual(detection.causes,['invisibility']);assert.equal(detection.diagnosticOnly,true);
  assert.equal(defenseLabel({coverBonus:0,concealed:false},detection),'Hidden (invisibility)');
  f.boss.checkCollision=(point,{type})=>type==='sight';
  detection=captionDetection(f.boss,f.player);
  assert.deepEqual(detection.causes,['invisibility','LOS blocked']);
  f.setStealth('hidden');detection=captionDetection(f.boss,f.player);
  assert.deepEqual(detection.causes,['stealth','invisibility','LOS blocked']);
  assert.equal(f.calls.some(call=>['create-effects','delete-items','condition'].includes(call[0])),false);
  assert.equal(f.player.actor.hasCondition('hidden'),false);
});

test('blocked sight uses sight walls and horizontal surfaces, not movement-only walls',()=>{
  const f=setup();f.boss.checkCollision=(point,{type})=>type==='move';
  assert.equal(captionDetection(f.boss,f.player).state,'observed');
  canvas.scene.testSurfaceCollision=(from,to,{type})=>type==='sight';
  const detection=captionDetection(f.boss,f.player);
  assert.equal(detection.state,'hidden');assert.deepEqual(detection.causes,['LOS blocked']);
});

test('sheet Hidden/Undetected and GM token hiding remain distinct caption inputs',()=>{
  const f=setup();f.player.actor.conditionsSet.add('hidden');
  assert.deepEqual(captionDetection(f.boss,f.player).causes,['stealth']);
  f.player.actor.conditionsSet.delete('hidden');f.player.actor.conditionsSet.add('undetected');
  assert.equal(captionDetection(f.boss,f.player).state,'undetected');
  f.player.actor.conditionsSet.clear();f.player.document.hidden=true;
  assert.deepEqual(captionDetection(f.boss,f.player).causes,['GM hidden']);
});

test('movement/selection refresh clears stale captions and native tooltip reads stay cached',async()=>{
  const f=setup(),awareness=new EnvironmentAwareness();let rays=0;
  f.boss.checkCollision=()=>{rays++;return true;};
  await awareness.schedule();assert.equal(awareness.label(f.player),'Hidden (LOS blocked)');
  const before=rays;for(let i=0;i<1000;i++)awareness.label(f.player);assert.equal(rays,before);
  f.boss.checkCollision=()=>false;await awareness.schedule(f.player.id);assert.equal(awareness.label(f.player),'Observed');
  f.player.actor.conditionsSet.add('invisible');await awareness.schedule(f.player.id);assert.equal(awareness.label(f.player),'Hidden (invisibility)');
  canvas.tokens.controlled=[f.player];await awareness.schedule();assert.equal(awareness.label(f.boss),'Observed');
});

test('Observed is explicit and client caption mode can require a configurable held key',async()=>{
  const f=setup();captionRenderer(canvas.tokens.placeables);let mode='hold';
  assert.equal(defenseLabel({coverBonus:0,concealed:false},captionDetection(f.boss,f.player)),'Observed');
  const awareness=new EnvironmentAwareness({captionMode:()=>mode});await awareness.schedule();
  const caption=awareness.captions.get(f.player);assert.equal(caption.text,'Observed');assert.equal(caption.visible,false);
  awareness.setCaptionHeld(true);assert.equal(caption.visible,true);
  awareness.setCaptionHeld(false);assert.equal(caption.visible,false);
  mode='always';awareness.setCaptionHeld(false);assert.equal(caption.visible,true);
});

test('player captions never mark an undetected or GM-hidden creature, even if a renderer leaves it visible',async()=>{
  const f=setup(),awareness=new EnvironmentAwareness();game.user.isGM=false;f.setStealth('undetected');
  f.player.isVisible=true;await awareness.schedule();assert.equal(awareness.label(f.player),'');
  assert.equal(awareness.entries.get(f.player.id).environment,null);
  f.flags.delete(`token-fighter:${ns}:stealth`);f.player.document.hidden=true;await awareness.schedule();
  assert.equal(awareness.label(f.player),'');
  game.user.isGM=true;await awareness.schedule();assert.equal(awareness.label(f.player),'Hidden (GM hidden)');
});

test('native invisibility/visibility remains authoritative for player token captions',async()=>{
  const f=setup(),awareness=new EnvironmentAwareness();game.user.isGM=false;
  f.player.actor.conditionsSet.add('invisible');f.player.isVisible=false;
  await awareness.schedule();assert.equal(awareness.label(f.player),'');
  f.player.isVisible=true;await awareness.schedule();assert.equal(awareness.label(f.player),'Hidden (invisibility)');
});

test('recorded stealth revealed by clear LOS without cover is no longer captioned as Hidden',()=>{
  const f=setup();f.setStealth('hidden');
  f.flags.get(`token-fighter:${ns}:stealth`).moving=false;
  assert.equal(captionDetection(f.boss,f.player).state,'observed');
});

test('observer-relative Hidden uses a client-local PF2e-style overlay and removes it when observed',async()=>{
  const f=setup();captionRenderer(canvas.tokens.placeables);f.setStealth('hidden');
  class Sprite{
    constructor(texture){this.texture=texture;this.anchor={set:(x,y)=>{this.anchorValue=[x,y];}};this.position={set:(x,y)=>{this.positionValue=[x,y];}};}
    destroy(){this.parent?.removeChild(this);this.destroyed=true;}
  }
  PIXI.Sprite=Sprite;globalThis.loadTexture=async path=>{assert.equal(path,'systems/pf2e/icons/conditions/hidden.webp');return {path};};
  const awareness=new EnvironmentAwareness();await awareness.schedule();
  const overlay=awareness.overlays.get(f.player);assert.ok(overlay);assert.equal(overlay.alpha,0.8);assert.equal(overlay.width,60);
  assert.deepEqual(overlay.anchorValue,[0.5,0.5]);assert.deepEqual(overlay.positionValue,[50,50]);
  f.setStealth('observed');await awareness.schedule(f.player.id);
  assert.equal(awareness.overlays.get(f.player),undefined);assert.equal(overlay.destroyed,true);
});
