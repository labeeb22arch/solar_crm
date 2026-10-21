import { COMPANY } from '../../data/seed.js';
import { projectDistrict } from '../district.js';

const pad = (n) => String(n).padStart(2, '0');
export const todayDdMmYyyy = (d = new Date()) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
export const DEFAULT_PAYMENT_TERMS = 'Mutually Agreed Terms of Payment …';

/** Data for the 4 agreement pages from a Solar CRM customer, Sunpay's stamp/sign and the screen's own choices. */
export function agreementData(p, assets = {}, extra = {}) {
  return {
    executionDate: extra.executionDate || todayDdMmYyyy(),
    consumerName: p.name || '',
    consumerNo: p.consumerNo || '',
    village: p.city || '',
    taluka: p.city || '',
    district: projectDistrict(p),
    vendorName: COMPANY.name,
    vendorAddress: COMPANY.address,
    paymentTerms: extra.paymentTerms ?? DEFAULT_PAYMENT_TERMS,
    showHighlights: extra.showHighlights ?? true,
    highlightColor: '#fef08a',
    firstPartySignature: p.signature?.png || null,
    secondPartyStamp: assets.stamp || null,
    secondPartySignature: assets.sign || null,
  };
}
