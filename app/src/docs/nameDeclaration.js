// Name declaration for the DISCOM / subsidy file: the customer confirms that the name on the electricity bill and
// the name on the bank account belong to the same person. Plain one-page A4 PDF.
// DRAFT WORDING — Sunpay should confirm it matches what their DISCOM accepts.
import { docFileName } from '../lib/docName.js';

export async function downloadNameDeclaration(row, company) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 20; const W = 170; let y = 24;
  const line = (text, { size = 11, bold = false, gap = 6.2 } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    pdf.splitTextToSize(text, W).forEach((t) => { pdf.text(t, L, y); y += gap; });
  };
  const today = new Date().toLocaleDateString('en-GB');
  const billName = row.discomName || row.name;
  const bankName = row.bankName || row.name;

  line('DECLARATION REGARDING NAME', { size: 14, bold: true, gap: 8 });
  line('(for PM Surya Ghar: Muft Bijli Yojana — subsidy and DISCOM file)', { size: 10, gap: 10 });
  line(`To: ${row.discom || 'The DISCOM'} / Whom it may concern`);
  y += 4;
  line(`I, ${bankName}, consumer number ${row.consumerNo || '______________'} of ${row.discom || '__________'}, hereby declare that:`);
  y += 2;
  line(`1. The name on my electricity bill is: ${billName}`);
  line(`2. The name on my bank account (${row.bank || 'bank'}) is: ${bankName}`);
  if (row.aadhaarName && row.aadhaarName !== '—') line(`3. The name on my Aadhaar card is: ${row.aadhaarName}`);
  y += 2;
  line('These names refer to one and the same person, namely myself. The difference is only in the way the name is written (initials, suffix such as "bhai"/"ben", or the order of names).');
  line('I request that the subsidy for my rooftop solar system be credited to the bank account named above. I make this declaration in good faith and the details above are true to the best of my knowledge.');
  y += 18;
  line('Signature: ______________________________');
  line(`Name: ${bankName}`);
  line(`Date: ${today}                    Place: ______________________`);
  y += 12;
  line(`Installer: ${company?.name || ''}, ${company?.address || ''}`, { size: 9, gap: 5 });
  pdf.save(docFileName('Name Declaration', row.name));
}
