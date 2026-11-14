import {getRulesRuntime} from './runtime.mjs';
import {registerRulesSetting} from '../foundry/rules-settings.mjs';
import {CORE_ID,ENVIRONMENT_ID} from '../foundry/rules-context.mjs';
import {installHazardMovement} from '../foundry/hazardous-terrain.mjs';
import {installStealthVisibility,openStealthControls} from '../foundry/stealth-awareness.mjs';
import {openZones} from '../foundry/environment-zones.mjs';
getRulesRuntime().register('environment',{
  init:runtime=>{
    registerRulesSetting('directionalZoneIndicators',{name:'Show directional zone defenses',scope:'client',config:true,type:Boolean,default:true,onChange:()=>void runtime.refresh()});
    registerRulesSetting('stealthStatusDisplay',{name:'Token stealth status hints',hint:'Always show observer-relative Observed, Hidden and Undetected captions, or show them only while holding the configured key.',scope:'client',config:true,type:String,choices:{always:'Always',hold:'While holding key'},default:'always',onChange:()=>void runtime.refresh()});
    game.keybindings.register(ENVIRONMENT_ID,'stealthStatusHold',{name:'Show token stealth status hints',hint:'Hold to show tactical token captions when Token stealth status hints is set to While holding key.',
      editable:[{key:'KeyV',modifiers:['Alt']}],onDown:()=>runtime.environmentAwareness.setCaptionHeld(true),onUp:()=>runtime.environmentAwareness.setCaptionHeld(false)});
  },
  start:runtime=>{installHazardMovement({packageId:CORE_ID});runtime.environmentAwareness.install({packageId:CORE_ID});installStealthVisibility({packageId:CORE_ID});},
  controls:[{name:'environmentZones',title:'Cover / concealment zones',icon:'fa-solid fa-cloud',order:102,palette:'regions',gmOnly:true,run:()=>openZones()},
    {name:'stealthControls',title:'Detection controls',icon:'fa-solid fa-eye',order:103,gmOnly:true,run:()=>openStealthControls()}],
});
