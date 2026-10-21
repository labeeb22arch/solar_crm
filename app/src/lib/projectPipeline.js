// Shared stage purpose and destination: one journey across Today, pipeline and customer.
const WORK = {
  leads: ['Quotation & registration', 'Confirm customer and system details, prepare the quotation and complete registration.', 'Prepare quotation', 'documents'],
  pending_loans: ['Funding', 'Follow up the advance or loan, bank details and finance documents.', 'Review finance', 'finance'],
  material_procurement: ['Materials', 'Prepare the customer BOM and coordinate stock and delivery.', 'Open customer BOM', 'bom'],
  pending_installation: ['Installation', 'Assign the team and visit date, then record installation progress.', 'Schedule installation', 'stage'],
  post_installation_docs: ['Installation records', 'Record equipment serials, site photos and the required submission documents.', 'Review technical details', 'overview'],
  discom_submissions: ['DISCOM submission', 'Prepare the scheme documents and follow up the electricity-board submission.', 'Prepare documents', 'documents'],
  meter_installation: ['Meter installation', 'Follow up meter installation and record the stage update.', 'Review meter installation', 'stage'],
  system_commissioning: ['Commissioning', 'Confirm commissioning and record the project update.', 'Review commissioning', 'stage'],
  meter_flag: ['Meter flag', 'Follow up the meter flag and record the project update.', 'Review meter flag', 'stage'],
  discom_inspection: ['Final inspection', 'Follow up inspection and handover before completing the project.', 'Review inspection', 'stage'],
  completed: ['Handover & warranty', 'Review the finished installation, coverage, serials and service history.', 'View warranty record', 'completed'],
};
export function pipelineWork(stage) {
  const [title, description, action, destination] = WORK[stage] || WORK.leads;
  return { title, description, action, destination };
}
export function pipelineUrl(project) {
  const { destination } = pipelineWork(project.stage || project.summary?.stage);
  const id = encodeURIComponent(project.id);
  if (destination === 'completed') return `/completed?p=${id}`;
  if (destination === 'bom') return `/supply/bom?p=${id}`;
  if (destination === 'stage') return `/p/${id}?stage=open`;
  return `/p/${id}?tab=${destination}`;
}
export const needsAttention = (r) => !!(projectNext(r)?.overdue || projectNext(r)?.status === 'blocked');
export function recentProjects(rows) {
  return [...rows].sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

const STAGE_TASK_KEYS = {
 leads:['enquiry','survey','quotation','proposal','agreement'],
 pending_loans:['method','loan_docs','sanction','loan_agreement','disbursement','advance','name_check'],
 material_procurement:['bom','reservation','challan','tally'],
 pending_installation:['team','installation'],
 post_installation_docs:['serials','discom_docs'],
 discom_submissions:['submission'],
 meter_installation:['net_meter'],
 system_commissioning:['commissioning'],
 meter_flag:[],
 discom_inspection:['inspection'],
 completed:[],
};
export function currentStageTask(tracks,stage,hidden=[]) {
 const keys=STAGE_TASK_KEYS[stage]||[];
 for(const key of keys) {
   if(hidden.includes(key))continue;
   for(const [track,tasks] of Object.entries(tracks||{})) {
     const task=tasks.find(t=>t.key===key&&t.status!=='done');
     if(task)return {...task,track};
   }
 }
 return null;
}
export const projectNext = r => Object.hasOwn(r,'stageNext')?r.stageNext:r.next;
