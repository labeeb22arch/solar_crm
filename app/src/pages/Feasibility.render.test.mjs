import { build } from 'esbuild';
import { unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const output=new URL('../../.feasibility-render-check.mjs',import.meta.url);
const fixtures={
  api:`export const getProject=()=>({id:'PRJ-2026-0063',name:'Test customer',paymentMethod:'Bank Solar Loan',summary:{stage:'pending_loans'}});export const getCompanyAssets=()=>({});export const canDo=()=>true;`,
  hooks:`export const useData=(fn)=>[fn()];export const useToast=()=>()=>{};`,
  ui:`import React from 'react';export const PageHead=({title,children})=>React.createElement('header',null,title,children);export const Empty=({children})=>React.createElement('p',null,children);export const BackToDocs=()=>null;`,
  picker:`export const CustomerPicker=()=>null;`,
  pdf:`export const mapFeasibilityReport=()=>({consumerName:'Test customer'});export const getMissingFeasibilityFields=()=>[];export const vendorFrom=()=>({});export const createFeasibilityPdf=async()=>new Blob();`,
  router:`export const useSearchParams=()=>[new URLSearchParams('p=PRJ-2026-0063'),()=>{}];export const NavLink=()=>null;`,
};
const plugin={name:'render-fixtures',setup(b){b.onResolve({filter:/.*/},(args)=>{
  let key;
  if(args.path.endsWith('/data/api.js'))key='api';
  else if(args.path.endsWith('/lib/hooks.jsx'))key='hooks';
  else if(args.path.endsWith('/components/ui.jsx'))key='ui';
  else if(args.path==='./Quotes.jsx')key='picker';
  else if(args.path.endsWith('/docs/feasibility.js'))key='pdf';
  else if(args.path==='react-router-dom')key='router';
  if(key)return {path:key,namespace:'fixture'};
});b.onLoad({filter:/.*/,namespace:'fixture'},(args)=>({contents:fixtures[args.path],loader:'js'}));}};
try {
  await build({entryPoints:[new URL('./Feasibility.jsx',import.meta.url).pathname],outfile:output.pathname,bundle:true,format:'esm',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime','@tabler/icons-react'],plugins:[plugin],logLevel:'silent'});
  const {default:Feasibility}=await import(output.href);
  const html=renderToStaticMarkup(React.createElement(Feasibility));
  assert.ok(html.includes('Feasibility report'));
  assert.ok(html.includes('Making the PDF'));
  assert.ok(html.includes('PM Surya Ghar Portal'));
  console.log('Feasibility renders with missing company assets without crashing');
} finally { await unlink(output).catch(()=>{}); }
