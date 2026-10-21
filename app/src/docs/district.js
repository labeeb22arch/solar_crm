// District for the seed cities (used on the feasibility report and the DISCOM agreement).
const DISTRICT = {
  Deesa: 'Banaskantha', Dhanera: 'Banaskantha', Tharad: 'Banaskantha', Bhabhar: 'Banaskantha', Kankrej: 'Banaskantha', Palanpur: 'Banaskantha',
  Patan: 'Patan', Siddhpur: 'Patan',
  Mehsana: 'Mehsana', Unjha: 'Mehsana',
  Himmatnagar: 'Sabarkantha',
  Ahmedabad: 'Ahmedabad', Gandhinagar: 'Gandhinagar', Vadodara: 'Vadodara', Anand: 'Anand', Surat: 'Surat',
};
export const districtFor = (city) => DISTRICT[String(city || '').trim()] || '';
/** Customer's own district if typed in, otherwise worked out from the city. */
export const projectDistrict = (p) => (p?.district ? String(p.district) : districtFor(p?.city));
/** Last 6-digit number in the address (the PIN code). */
export const pincodeFrom = (address) => { const m = String(address || '').match(/\b\d{6}\b/g); return m ? m[m.length - 1] : ''; };
