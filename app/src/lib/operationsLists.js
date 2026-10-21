import { BANKS, DISCOMS, CITY_BRANCH, PAY_METHODS } from '../data/seed.js';
const pairs=(values)=>values.map((name)=>({value:name,name}));
export const OPERATIONS_CATEGORIES=[
 {key:'panel_brands',group:'Equipment',label:'Panel brands',hint:'Manufacturers used in technical records and quotations.',defaults:pairs(['ADANI','WAAREE','PAHAL','Vikram Solar'])},
 {key:'inverter_brands',group:'Equipment',label:'Inverter brands',hint:'Inverter manufacturers used by the team.',defaults:pairs(['SOLARYAAN','KSOLARE','GROWATT','POLYCAB','WAAREE','YAAN','Deye'])},
 {key:'panel_models',group:'Equipment',label:'Panel models',hint:'Panel technologies and model names.',defaults:pairs(['Mono PERC DCR','Mono PERC 540 Wp','TOPCon bifacial 550 Wp','ADANI TOPCON','WAAREE TOPCON','PAHAL TOPCON'])},
 {key:'inverter_models',group:'Equipment',label:'Inverter models',hint:'Add the model names you install.',defaults:[]},
 {key:'meter_phases',group:'Equipment',label:'Meter phases',hint:'Supply phase for the customer site.',defaults:pairs(['Single phase','Three phase','Three phase (extension)'])},
 {key:'structures',group:'Equipment',label:'Mounting structures',hint:'Structure choices used in proposals and technical records.',defaults:pairs(['GI elevated (6 ft)','GI elevated (9 ft)','RCC flush mount','Tin-shed mini rail','HDG / GI structure'])},
 {key:'schemes',group:'Customer & registration',label:'Project schemes',hint:'Scheme labels used to determine which documents are needed.',defaults:[{value:'pm_surya_ghar',name:'PM Surya Ghar'},{value:'non_subsidy',name:'Non-subsidy project'}]},
 {key:'customer_types',group:'Customer & registration',label:'Customer types',hint:'Customer segments. Commercial and industrial booking remain unavailable.',defaults:pairs(['Residential','Commercial','Industrial'])},
 {key:'registration_types',group:'Customer & registration',label:'Registration types',hint:'Portal, bank and customer registration references.',defaults:pairs(['PM Surya Ghar portal','Jan Samarth loan application','DISCOM consumer registration','Net-metering application'])},
 {key:'registration_statuses',group:'Customer & registration',label:'Registration statuses',hint:'Portal registration progress on the customer record.',defaults:pairs(['Not started','Applied','Submitted','Approved','Rejected','Correction required'])},
 {key:'banks',group:'Customer & registration',label:'Banks',hint:'Banks for loan applications and customer records.',defaults:pairs(BANKS)},
 {key:'discoms',group:'Customer & registration',label:'DISCOMs',hint:'Electricity distribution companies.',defaults:pairs(DISCOMS)},
 {key:'cities',group:'Customer & registration',label:'Cities & areas',hint:'Locations available when creating a lead.',defaults:pairs(Object.keys(CITY_BRANCH))},
 {key:'payment_methods',group:'Finance',label:'Payment methods',hint:'Customer financing and payment methods.',defaults:pairs(PAY_METHODS)},
 {key:'receipt_modes',group:'Finance',label:'Receipt modes',hint:'How customer payments are received.',defaults:pairs(['Cash','UPI','Bank transfer','Cheque','Card','Demand draft'])},
 {key:'financial_tags',group:'Finance',label:'Financial tags · General',hint:'Payment labels used for collection notes.',defaults:pairs(['Initial','Installation','Final payment'])},
 {key:'financial_tags_surya',group:'Finance',label:'Financial tags · PM Surya Ghar',hint:'Payment labels for scheme customers.',defaults:pairs(['Registration payment 20k','Installation payment','Quotation amount','Final payment after meter installation'])},
];
export function operationsOptions(settings={},category,includeInactive=false) {
 const config=OPERATIONS_CATEGORIES.find((c)=>c.key===category);if(!config)return [];
 let options=settings.optionLists?.[category];
 if(!Array.isArray(options)) {
   options=config.defaults.map((option,index)=>({...option,id:`${category}-${index}`,active:true}));
   const legacy=category==='panel_brands'||category==='inverter_brands'?(settings.brands||[]).filter((b)=>b.type===(category==='panel_brands'?'panel':'inverter')):category==='panel_models'||category==='inverter_models'?(settings.models||[]).filter((b)=>b.type===(category==='panel_models'?'panel':'inverter')):[];
   for(const entry of legacy)if(!options.some((o)=>o.name.toLowerCase()===entry.name.toLowerCase()))options.push({...entry,value:entry.name,active:true});
 }
 return options.filter((option)=>includeInactive||option.active!==false).map((option)=>({...option}));
}
export function changeOperationsOption(settings,category,action,input,actor,at,id) {
 if(!OPERATIONS_CATEGORIES.some((c)=>c.key===category))throw new Error('Choose a valid category');
 const options=operationsOptions(settings,category,true);const name=String(input.name||'').trim();
 const target=options.find((option)=>option.id===input.id);
 if(['add','rename'].includes(action)&&(!name||name.length>120))throw new Error('Enter an option name, up to 120 characters');
 if(['add','rename'].includes(action)&&options.some((option)=>option.id!==input.id&&option.name.toLowerCase()===name.toLowerCase()))throw new Error('This option already exists. Restore it if it is archived.');
 if(action==='add')options.push({id,value:name,name,active:true,createdBy:actor,createdAt:at});
 else {if(!target)throw new Error('Option not found');if(action==='rename')target.name=name;else if(action==='archive')target.active=false;else if(action==='restore')target.active=true;else throw new Error('Unknown option change');}
 return {...settings,optionLists:{...settings.optionLists,[category]:options},history:[...(settings.history||[]),{id,category,action,name:action==='add'||action==='rename'?name:target.name,by:actor,at}]};
}
export function keepCurrentOption(options,current) {return current&&!options.some((o)=>o.value===current)?[{value:current,name:current,id:'saved-current'},...options]:options;}
