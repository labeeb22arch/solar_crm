// Turns an on-screen document (HTML) into an A4 PDF and downloads it. Tall content flows onto more pages.
export async function downloadElementAsPdf(el, fileName) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = 210; const pageH = 297; const margin = 10;
  const w = pageW - margin * 2;
  const pxPerMm = canvas.width / w;
  const sliceH = Math.floor((pageH - margin * 2) * pxPerMm);
  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page += 1) {
    const part = document.createElement('canvas');
    part.width = canvas.width; part.height = Math.min(sliceH, canvas.height - y);
    part.getContext('2d').drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height);
    if (page > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(part.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, w, part.height / pxPerMm, undefined, 'FAST');
  }
  pdf.save(fileName);
  return pdf.getNumberOfPages();
}
