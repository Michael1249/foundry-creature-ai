// Elevation modules own the native tooltip. Tactical captions use a separate
// child so neither module rewrites the other's PIXI text or rebuilds its texture.
export class TokenCaptions {
  constructor({visible=()=>true}={}){this.displays=new Map();this.visible=visible;}
  get(token){return this.displays.get(token);}
  remove(token){
    const display=this.get(token);this.displays.delete(token);
    if(display&&!display.destroyed){display.parent?.removeChild(display);display.destroy();}
  }
  clear(){for(const token of this.displays.keys())this.remove(token);}
  update(token,text){
    if(!text||token.destroyed){this.remove(token);return;}
    const Text=globalThis.foundry?.canvas?.containers?.PreciseText;
    if(!Text||!token.tooltip||!token.addChild)return;
    let display=this.get(token);
    if(!display||display.destroyed||display.parent!==token){
      this.remove(token);
      display=new Text(text,token.tooltip.style.clone());
      display.name='pf2e-tactical-caption';display.eventMode='none';display.anchor.set(0.5,1);
      token.addChild(display);this.displays.set(token,display);
    }
    if(display.text!==text)display.text=text;
    this.layout(token);
  }
  layout(token){
    const display=this.get(token),tooltip=token.tooltip;
    if(!display||display.destroyed||!tooltip)return;
    display.visible=this.visible()&&tooltip.visible!==false&&!token.document.isSecret;
    display.scale.set(tooltip.scale.x,tooltip.scale.y);
    display.x=tooltip.x;
    display.y=tooltip.y-(tooltip.text?tooltip.height:0)-3*tooltip.scale.y;
  }
}

const HIDDEN_ICON='systems/pf2e/icons/conditions/hidden.webp';

// Observer-relative stealth cannot use a real PF2e Hidden condition because
// that would disclose one observer's result to every client. This local overlay
// mirrors Foundry's native 60%-size, 80%-opacity condition overlay without
// changing the Actor, TokenDocument or mechanical condition state.
export class TokenStealthOverlays {
  constructor(){this.displays=new Map();this.desired=new Map();}
  get(token){return this.displays.get(token);}
  remove(token){
    this.desired.set(token,false);
    const display=this.get(token);this.displays.delete(token);
    if(display&&!display.destroyed){display.parent?.removeChild(display);display.destroy();}
  }
  clear(){for(const token of new Set([...this.displays.keys(),...this.desired.keys()]))this.remove(token);this.desired.clear();}
  async update(token,hidden){
    this.desired.set(token,Boolean(hidden));
    if(!hidden||token.destroyed){this.remove(token);return;}
    let display=this.get(token);
    if(!display||display.destroyed||display.parent!==token){
      this.remove(token);this.desired.set(token,true);
      if(!globalThis.PIXI?.Sprite||typeof globalThis.loadTexture!=='function'||!token.addChild)return;
      const texture=await loadTexture(HIDDEN_ICON,{fallback:'icons/svg/mystery-man.svg'});
      if(!this.desired.get(token)||token.destroyed)return;
      display=new PIXI.Sprite(texture);display.name='pf2e-tactical-hidden-overlay';display.eventMode='none';display.alpha=0.8;
      const index=token.children?.indexOf?.(token.effects)??-1;
      if(index>=0&&token.addChildAt)token.addChildAt(display,index);else token.addChild(display);
      this.displays.set(token,display);
    }
    this.layout(token);
  }
  layout(token){
    const display=this.get(token);if(!display||display.destroyed)return;
    const native=token.document.getSize?.()??{width:token.w,height:token.h};
    const size=Math.min(native.width??token.w,native.height??token.h)*0.6;
    const center=token.document.getCenterPoint?.({x:0,y:0})??{x:token.w/2,y:token.h/2};
    display.width=display.height=size;display.position?.set?.(center.x,center.y);display.x=center.x;display.y=center.y;
    display.anchor?.set?.(0.5,0.5);display.visible=token.visible!==false&&!token.document.isSecret;
  }
}
