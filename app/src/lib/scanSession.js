// Own pending permission/photo work as well as an already-started camera.
export function createScanSession(){
 let generation=0,control=null,stream=null;
 const stop=()=>{generation++;control?.stop?.();control=null;stream?.getTracks?.().forEach(t=>t.stop());stream=null;};
 return {begin(){stop();return generation;},valid:id=>id===generation,stop,
 attachStream(id,next){if(id!==generation){next?.getTracks?.().forEach(t=>t.stop());return false;}stream=next;return true;},
 attachControl(id,next){if(id!==generation){next?.stop?.();return false;}control=next;return true;}};
}
