export const SCHEMES = [['', 'Choose scheme'], ['pm_surya_ghar', 'PM Surya Ghar'], ['non_subsidy', 'Non-subsidy project']];
export function documentRules(p) {
  const stage = p.summary?.stage || p.stage || 'leads';
  const loan = ['Bank Solar Loan', 'Personal Loan'].includes(p.paymentMethod);
  const pm = p.scheme === 'pm_surya_ghar';
  const lead = stage === 'leads' && !p.portalId;
  const historic = (key) => !!p.documentDownloads?.[key] || !!p.docLinks?.[key] || (key === 'quote' && !!p.quotation) || (key === 'proposal' && !!p.proposal) || (key === 'agreement' && !!(p.signRequest || p.signature));
  const financeStage = ['pending_loans', 'material_procurement'].includes(stage);
  const submissionStage = ['post_installation_docs', 'discom_submissions'].includes(stage);
  const classify = (key) => {
    let applicable = true, current = false, reason = '';
    if (key === 'quote' || key === 'proposal') { applicable = lead; current = lead; reason = 'Quotation is prepared in Leads, before portal registration.'; }
    if (key === 'feas') { applicable = loan; current = loan && financeStage; reason = loan ? 'Prepare during loan processing.' : 'Not required for cash or other self-funded payments.'; }
    if (key === 'agreement') { applicable = pm; current = pm && submissionStage; reason = pm ? 'Prepare during post-installation documents / DISCOM submission.' : 'This PM Surya Ghar form is only for scheme customers.'; }
    if (key === 'name') { applicable = pm && !!p.nameCheck && !p.nameCheck.match && !p.nameCheck.resolution; current = applicable && stage !== 'leads'; reason = 'Only needed for a PM Surya Ghar name mismatch.'; }
    if (key === 'invoice') current = true;
    if (key === 'drive') current = true;
    if (current) return { bucket: 'current', reason };
    if (historic(key)) return { bucket: 'history', reason: 'Previously created or linked for this customer.' };
    return { bucket: applicable ? 'later' : 'hidden', reason };
  };
  return { stage, loan, pm, lead, classify };
}

// Visibility is stable; stage rules explain timing rather than hiding entry points.
export function documentAvailable(p,key,prepared=false) {
  if (prepared || key==='quote') return true;
  const rules=documentRules(p);
  return key==='feas'?rules.loan:key==='agreement'?rules.pm:false;
}
