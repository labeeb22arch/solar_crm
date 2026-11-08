import {useEffect,useRef,useState} from 'react';
import {createScanSession} from '../lib/scanSession.js';
const cameraError=e=>e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access or read a label photo.':e.name==='NotFoundError'?'No camera was found. Read a label photo or type the serial number.':e.name==='NotReadableError'?'The camera is in use by another app. Close it there, or read a label photo.':e.message||'Could not open the camera. Try a label photo or manual entry.';
async function reader(){
 const [{BrowserMultiFormatReader},{DecodeHintType}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
 return new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER,true]]),{delayBetweenScanAttempts:150});
}
export default function SerialScanner({onSerial,disabled=false}){
 const video=useRef(null),session=useRef(null);if(!session.current)session.current=createScanSession();
 const [active,setActive]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[value,setValue]=useState(''),[target,setTarget]=useState('module'),[scannedTarget,setScannedTarget]=useState('module');
 const stop=()=>{session.current.stop();if(video.current)video.current.srcObject=null;setActive(false);setBusy(false);};
 useEffect(()=>()=>session.current.stop(),[]);
 useEffect(()=>{if(disabled)stop();},[disabled]);
 const start=async()=>{
  if(busy||disabled)return;const current=session.current,attempt=current.begin(),destination=target;setError('');setValue('');setBusy(true);
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Use HTTPS (or localhost) for camera access, or read a label photo.');
   const decoder=await reader();if(!current.valid(attempt))return;
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
   if(!current.attachStream(attempt,stream))return;
   setActive(true);
   const handle=await decoder.decodeFromStream(stream,video.current,(result)=>{
    if(result&&current.valid(attempt)){setValue(result.getText().trim());setScannedTarget(destination);current.stop();setActive(false);setBusy(false);navigator.vibrate?.(30);}
   });
   if(current.attachControl(attempt,handle))setBusy(false);
  }catch(e){if(current.valid(attempt)){stop();setError(cameraError(e));}}
 };
 const photo=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file||disabled)return;
  const current=session.current,attempt=current.begin(),destination=target;setActive(false);setBusy(true);setValue('');setError('');const url=URL.createObjectURL(file);
  try{const decoder=await reader();if(!current.valid(attempt))return;const result=await decoder.decodeFromImageUrl(url);if(current.valid(attempt)){setValue(result.getText().trim());setScannedTarget(destination);}}
  catch{if(current.valid(attempt))setError('No readable barcode or QR code found. Use a sharp, well-lit label photo, or type the serial number.');}
  finally{URL.revokeObjectURL(url);if(current.valid(attempt))setBusy(false);}
 };
 return <section className="serial-camera"><label className="fld"><span>Scanning for</span><select className="select" value={target} disabled={active||busy||disabled} onChange={e=>{setTarget(e.target.value);setValue('');}}><option value="module">Panel serial number</option><option value="inverter">Inverter serial number</option></select></label><video ref={video} muted playsInline autoPlay aria-label="Live barcode camera" hidden={!active&&!busy}/><div className="row" style={{gap:8,flexWrap:'wrap'}}>{active||busy?<button className="btn" type="button" onClick={stop}>Cancel scan / stop camera</button>:<button className="btn primary big-btn" type="button" disabled={disabled} onClick={start}>Open phone camera</button>}<label className="btn" style={{cursor:busy?'default':'pointer'}}>Read label photo<input aria-label="Read serial label photo" className="sr-only" type="file" accept="image/*" disabled={busy||disabled} onChange={photo}/></label></div>{busy&&<p role="status">{active?'Looking for a barcode…':'Opening scanner…'}</p>}{value&&<div className="card card-b"><label className="fld"><span>Check scanned {scannedTarget==='inverter'?'inverter':'panel'} serial number</span><input className="input mono" value={value} onChange={e=>setValue(e.target.value)}/></label><button type="button" className="btn primary" disabled={disabled||!value.trim()} onClick={()=>{onSerial(value.trim(),scannedTarget);setValue('');}}>Use this serial number</button></div>}{error&&<p role="alert" className="form-err">{error}</p>}<p className="small faint">Read a barcode or QR code, confirm the number, then save the serial numbers below. Plain printed text can be entered manually.</p></section>;
}
