export function cleanSerials(input){
 if(!Array.isArray(input?.modules))throw new Error('Enter panel serial numbers');
 const clean=value=>{const serial=String(value??'').trim().toUpperCase();if(serial.length>160||/[\r\n\x00-\x1f]/.test(serial))throw new Error('Enter one serial number at a time');return serial;};
 return {modules:[...new Set(input.modules.map(clean).filter(Boolean))],inverter:clean(input.inverter)};
}
export function serialStatus(project,serials){
 const wp=Number(project.warranty?.moduleWp||project.moduleWp)||540;
 const required=Math.ceil(Number(project.kwp||0)*1000/wp);
 return serials.inverter&&serials.modules.length>=Math.max(1,required)?'done':serials.inverter||serials.modules.length?'in_progress':'not_started';
}
