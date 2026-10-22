export async function makeBOMPdf(project, version) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  let y = 20;
  const line = (value, bold = false, size = 10) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    const rows = pdf.splitTextToSize(String(value || ''), 180);
    for (const row of rows) { if (y > 278) { pdf.addPage(); y = 20; } pdf.text(row, 15, y); y += size > 12 ? 9 : 6; }
  };
  line('SOLAR CRM', true, 16); line('MATERIAL PROCUREMENT - BILL OF MATERIALS', true, 13);
  line(`${project.name} | ${project.crn}`); line(`${project.city} | ${project.kwp} kWp`);
  line(`Version ${version.version} | Prepared by ${version.createdBy} | ${new Date(version.createdAt).toLocaleDateString('en-IN')}`);
  y += 6;
  version.lines.forEach((item, index) => { line(`${index + 1}. ${item.name}`, true); line(`SKU: ${item.sku}     Quantity: ${item.qty} ${item.unit}`); if (item.note) line(`Note: ${item.note}`); y += 3; });
  if (version.notes) { line('Procurement notes', true); line(version.notes); }
  y += 8; line('Prepared by: __________________    Store checked by: __________________');
  line('Received / approved by: __________________    Date: __________________');
  const pages = pdf.getNumberOfPages();
  for (let n=1;n<=pages;n++) { pdf.setPage(n);pdf.setFontSize(8);pdf.text(`${project.crn} | BOM v${version.version} | Page ${n} of ${pages}`,15,290); }
  return pdf;
}
