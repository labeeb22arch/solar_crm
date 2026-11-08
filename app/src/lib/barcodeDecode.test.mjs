import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {QRCodeWriter,BarcodeFormat,DecodeHintType,RGBLuminanceSource,BinaryBitmap,HybridBinarizer,MultiFormatReader}=require('@zxing/library');
for(const [writer,format,text] of [[new QRCodeWriter(),BarcodeFormat.QR_CODE,'DEMO-SCAN-VERIFY-001']]){
 const matrix=writer.encode(text,format,600,400,new Map());const w=matrix.getWidth(),h=matrix.getHeight(),pixels=new Uint8ClampedArray(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)pixels[y*w+x]=matrix.get(x,y)?0:255;
 const decoder=new MultiFormatReader();decoder.setHints(new Map([[DecodeHintType.TRY_HARDER,true],[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.QR_CODE]]]));
 const result=decoder.decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,w,h))));assert.equal(result.getText(),text);
}
console.log('Real QR serial decoding passed');
