import { useId } from 'react';
import * as api from '../data/api.js';
import { useData } from '../lib/hooks.jsx';
import { keepCurrentOption } from '../lib/operationsLists.js';
export function ManagedSelect({category,value,placeholder,children,disabledValues=[],...props}) {
 const [options]=useData(()=>api.getDropdownOptions(category),[category]);
 return <select {...props} value={value??''}>{placeholder&&<option value="">{placeholder}</option>}{keepCurrentOption(options||[],value).map((option)=><option key={option.id} value={option.value} disabled={disabledValues.includes(option.value)}>{option.name}</option>)}{children}</select>;
}
export function ManagedInput({category,...props}) {
 const id=useId();const [options]=useData(()=>category?api.getDropdownOptions(category):Promise.resolve([]),[category]);
 return <><input {...props} list={id}/><datalist id={id}>{(options||[]).map((option)=><option key={option.id} value={option.name}/>)}</datalist></>;
}
