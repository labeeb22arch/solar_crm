export function nextStage(stages, current) {
  const index = stages.findIndex((stage) => stage.id === current);
  return index >= 0 ? stages[index + 1] || null : null;
}
export function confirmedNextStage(stages,current,expected){
 if(!expected)throw new Error('Review and confirm the current stage first');
 if(current!==expected)throw new Error('The stage changed. Close this dialog and review the current stage.');
 const next=nextStage(stages,current);
 if(!next)throw new Error('This customer is already at the final stage');
 return next;
}
