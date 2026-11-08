// Isolated data-layer regression checks: never connect to a real backend.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createServer as createHttpServer} from 'node:http';
import {fileURLToPath} from 'node:url';
process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_ANON_KEY='';
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
globalThis.location={hash:'#/today',origin:'http://localhost',pathname:'/'};
const http=createHttpServer();
const server=await createServer({root:fileURLToPath(new URL('../..',import.meta.url)),server:{middlewareMode:true,hmr:{server:http}},appType:'custom'});
try{
 const api=await server.ssrLoadModule('/src/data/api.js');
 assert.equal(api.getSession().cloud,false,'tests must never use cloud records');await api.init();await api.signIn('1@crm');
 const roster=await api.listAttendance(),person=roster[0].name,day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 await api.recordAttendance(person,{date:day,status:'present',note:'First recorded entry'});
 await api.recordAttendance(person,{date:day,status:'half',note:'Corrected entry'});
 const recorded=(await api.listAttendance())[0];assert.equal(recorded.entries[day].status,'half');assert.equal(recorded.entryHistory.at(-1).note,'First recorded entry');
 const loans=await api.listFinanceTracking('loan');const p=await api.getProject(loans[0].id);const payments=JSON.stringify(p.payments);
 await api.updateFinanceTracking(p.id,'loan',{date:day,status:'first_payment',amount:10000,note:'Bank release tag only'});
 const after=await api.getProject(p.id);assert.equal(JSON.stringify(after.payments),payments,'loan tag must not create or rewrite customer receipts');assert.equal(after.financeTracking.loan.history.at(-1).amount,10000);
 await assert.rejects(()=>api.recordAttendance(person,{date:day,status:'made_up'}),/status/);

 await assert.rejects(()=>api.updateFinanceTracking(p.id,'loan',{date:day,status:'sanctioned',expectedStatus:'not_applied'}),/status changed/);
 const beforeDemo=(await api.documentQueueCustomers()).map(p=>p.id);
 const populated=await api.addDemoCustomers({showcase:true});assert.equal(populated.added,66);
 assert.equal((await api.addDemoCustomers({showcase:true})).added,0,'repeat add must not duplicate records');
 const dashboard=await api.financeDashboard();
 assert.ok(dashboard.customers.length);assert.ok(dashboard.customers.every(p=>p.balance===Math.max(0,p.value-p.paid)));
 assert.equal(dashboard.outstanding,dashboard.customers.reduce((sum,p)=>sum+p.balance,0));
 const queue=await api.documentQueueCustomers();assert.ok(beforeDemo.every(id=>queue.some(p=>p.id===id)));
 const showcase=queue.filter(p=>p.id.includes('showcase-v2'));assert.equal(showcase.length,66);
 assert.ok(showcase.some(p=>p.documents.some(d=>d.inbox?.bucket==='received')));
 assert.ok(showcase.some(p=>p.documents.some(d=>d.inbox?.bucket==='waiting')));
 assert.equal((await api.getSignRequest('demo-only-0001-proposal')).status,'unknown','demo tokens must not be live signing links');
 const beforeStage=await api.getProject(showcase[1].id);await api.moveToNextStage(beforeStage.id,beforeStage.summary.stage);const moved=await api.getProject(beforeStage.id);const moveEvent=moved.timeline.at(-1);assert.equal(moveEvent.fromStage,beforeStage.summary.stage);assert.equal(moveEvent.toStage,moved.summary.stage);assert.equal(moveEvent.stageChangedAt,moved.stageAt);assert.ok(Date.parse(moveEvent.at));assert.equal(moveEvent.by,'Demo admin');assert.equal(moved.summary.updatedBy,'Demo admin');
 const receiptCustomer=await api.getProject(showcase[0].id),plan=JSON.stringify(receiptCustomer.schedule),requestId='receipt-history-verification';
 await api.addCustomerReceipt(receiptCustomer.id,{amount:1234.5,date:day,mode:'Bank transfer',ref:'DEMO-HISTORY-ONLY',recordedBy:'Forged actor',recordedAt:'2000-01-01'},requestId);
 await api.addCustomerReceipt(receiptCustomer.id,{amount:1234.5,date:day,mode:'Bank transfer',ref:'DEMO-HISTORY-ONLY'},requestId);
 const savedReceipts=await api.getProject(receiptCustomer.id),receipt=savedReceipts.payments.find(r=>r.requestId===requestId);
 assert.equal(savedReceipts.payments.filter(r=>r.requestId===requestId).length,1);assert.equal(receipt.amount,1234.5);
 assert.equal(receipt.recordedBy,'Demo admin');assert.ok(Date.parse(receipt.recordedAt)>Date.parse('2026-01-01'));
 assert.equal(receipt.milestoneIndex,undefined);assert.equal(JSON.stringify(savedReceipts.schedule),plan);

 await api.signOut();api.setSession({role:'Technician'});
 await assert.rejects(()=>api.recordAttendance(person,{date:day,status:'present'}),/permission|access|allowed/i);
 await assert.rejects(()=>api.addDemoCustomers({showcase:true}),/Admin/);
 await assert.rejects(()=>api.financeDashboard(),/permission|access|allowed/i);
 await assert.rejects(()=>api.listAttendance(),/permission|access|allowed/i);
 await assert.rejects(()=>api.updateFinanceTracking(p.id,'loan',{date:day,status:'sanctioned'}),/permission|access|allowed/i);
 console.log('Admin workflow integration passed: attendance history, payment isolation, stale confirmations, additive demo population, document queues and role restrictions.');
}finally{await server.close();}
