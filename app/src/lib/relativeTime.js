export function relativeTime(value,now=Date.now()) {
 const at=Date.parse(value);
 if(!Number.isFinite(at))return 'not recorded';
 const seconds=Math.max(0,Math.floor((now-at)/1000));
 if(seconds<60)return 'just now';
 const [count,unit]=seconds<3600?[Math.floor(seconds/60),'minute']:seconds<86400?[Math.floor(seconds/3600),'hour']:seconds<604800?[Math.floor(seconds/86400),'day']:seconds<31536000?[Math.floor(seconds/604800),'week']:[Math.floor(seconds/31536000),'year'];
 return `${count} ${unit}${count===1?'':'s'} ago`;
}
