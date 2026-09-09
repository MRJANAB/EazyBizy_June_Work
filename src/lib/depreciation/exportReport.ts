import { DepreciationAsset, DepreciationComparison, DISCLAIMER_TEXT } from "@/types/depreciation";
// exceljs and jspdf are dynamically imported inside each export function below
// so their ~400KB combined weight only downloads when a user actually clicks
// an export button, not on initial load of the Depreciation module.

const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function exportComparisonCsv(comparison: DepreciationComparison) {
  const lines: string[] = [];
  lines.push(`Depreciation & WDV Report`);
  lines.push(`Asset Name,${comparison.asset.asset_name}`);
  lines.push(`Asset ID,${comparison.asset.asset_code}`);
  lines.push(`Financial Year,${comparison.financial_year}`);
  lines.push("");
  lines.push("Particular,Companies Act,Income Tax,Generic WDV");
  comparison.rows.forEach((row) => {
    lines.push(`"${row.particular}","${row.companies_act}","${row.income_tax}","${row.generic_wdv}"`);
  });
  lines.push("");
  lines.push(`"${DISCLAIMER_TEXT}"`);
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${comparison.asset.asset_code}_depreciation_comparison.csv`);
}

// ── Excel (multi-sheet) ──────────────────────────────────────────────────────

export async function exportDepreciationExcel(params: {
  assets: DepreciationAsset[];
  comparisons: DepreciationComparison[];
}) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EazyBizy Depreciation & WDV System";
  workbook.created = new Date();

  // 1. Asset Master
  const assetSheet = workbook.addWorksheet("Asset Master");
  assetSheet.addRow(["Asset ID", "Asset Name", "Category", "Acquisition Date", "Date Put to Use", "Original Cost", "Status"]);
  params.assets.forEach((a) =>
    assetSheet.addRow([a.asset_code, a.asset_name, a.asset_category, a.acquisition_date, a.date_put_to_use || "", a.original_cost, a.status]),
  );
  assetSheet.getRow(1).font = { bold: true };

  // 2. Companies Act
  const caSheet = workbook.addWorksheet("Companies Act");
  caSheet.addRow(["Asset ID", "Asset Name", "Method", "Gross Block", "Residual Value", "Useful Life (yrs)", "Current-Year Depreciation", "Accumulated Depreciation", "Net Book Value"]);
  params.comparisons.forEach((c) => {
    if (!c.companies_act) return;
    const r = c.companies_act;
    caSheet.addRow([c.asset.asset_code, c.asset.asset_name, r.method, r.gross_block, r.residual_value, r.useful_life_years, r.current_year_depreciation, r.closing_accumulated_depreciation, r.closing_carrying_amount]);
  });
  caSheet.getRow(1).font = { bold: true };

  // 3. Income Tax
  const itSheet = workbook.addWorksheet("Income Tax");
  itSheet.addRow(["Asset ID", "Asset Name", "Block", "Rate %", "Opening WDV", "Additions <180d", "Additions >=180d", "Disposal", "Full Dep.", "Restricted Dep.", "Total Dep.", "Closing WDV"]);
  params.comparisons.forEach((c) => {
    if (!c.income_tax) return;
    const r = c.income_tax;
    itSheet.addRow([c.asset.asset_code, c.asset.asset_name, r.block_name, r.applicable_rate_pct, r.opening_wdv, r.additions_lt_180_days, r.additions_gte_180_days, r.disposal_adjustment, r.full_depreciation, r.restricted_depreciation, r.total_depreciation, r.closing_wdv]);
  });
  itSheet.getRow(1).font = { bold: true };

  // 4. Generic WDV
  const gwSheet = workbook.addWorksheet("Generic WDV");
  gwSheet.addRow(["Asset ID", "Asset Name", "Opening WDV", "Rate %", "Depreciation", "Closing WDV"]);
  params.comparisons.forEach((c) => {
    if (!c.generic_wdv) return;
    const r = c.generic_wdv;
    gwSheet.addRow([c.asset.asset_code, c.asset.asset_name, r.opening_wdv, r.depreciation_rate_pct, r.depreciation, r.closing_wdv]);
  });
  gwSheet.getRow(1).font = { bold: true };

  // 5. Comparison
  const cmpSheet = workbook.addWorksheet("Comparison");
  cmpSheet.addRow(["Asset ID", "Asset Name", "Particular", "Companies Act", "Income Tax", "Generic WDV"]);
  params.comparisons.forEach((c) => {
    c.rows.forEach((row) => {
      cmpSheet.addRow([c.asset.asset_code, c.asset.asset_name, row.particular, row.companies_act, row.income_tax, row.generic_wdv]);
    });
  });
  cmpSheet.getRow(1).font = { bold: true };

  // 6. Calculation Audit
  const auditSheet = workbook.addWorksheet("Calculation Audit");
  auditSheet.addRow(["Asset ID", "Asset Name", "Basis", "Step"]);
  params.comparisons.forEach((c) => {
    c.companies_act?.calculation_steps.forEach((s) => auditSheet.addRow([c.asset.asset_code, c.asset.asset_name, "Companies Act", s]));
    c.income_tax?.calculation_steps.forEach((s) => auditSheet.addRow([c.asset.asset_code, c.asset.asset_name, "Income Tax", s]));
    c.generic_wdv?.calculation_steps.forEach((s) => auditSheet.addRow([c.asset.asset_code, c.asset.asset_name, "Generic WDV", s]));
  });
  auditSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(new Blob([buffer], { type: "application/octet-stream" }), "depreciation_wdv_report.xlsx");
}

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function exportComparisonPdf(comparison: DepreciationComparison) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  let y = 15;

  doc.setFontSize(16);
  doc.text("DEPRECIATION & WDV REPORT", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Asset Name: ${comparison.asset.asset_name}`, 14, y); y += 5;
  doc.text(`Asset ID: ${comparison.asset.asset_code}`, 14, y); y += 5;
  doc.text(`Category: ${comparison.asset.asset_category}`, 14, y); y += 5;
  doc.text(`Financial Year: ${comparison.financial_year}`, 14, y); y += 5;
  doc.text(`Prepared: ${new Date().toLocaleDateString("en-IN")}`, 14, y); y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Particular", "Companies Act (BOOK)", "Income Tax (TAX)", "Generic WDV"]],
    body: comparison.rows.map((r) => [r.particular, String(r.companies_act), String(r.income_tax), String(r.generic_wdv)]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [21, 184, 170] },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("BOOK vs TAX DEPRECIATION", 14, y);
  y += 6;
  doc.setFontSize(9);
  if (comparison.differences.book_vs_tax_depreciation !== undefined) {
    doc.text(`Difference in Current-Year Depreciation (Book − Tax): ${fmt(comparison.differences.book_vs_tax_depreciation)}`, 14, y); y += 5;
  }
  if (comparison.differences.book_vs_tax_closing_value !== undefined) {
    doc.text(`Difference in Closing Value (Book − Tax WDV): ${fmt(comparison.differences.book_vs_tax_closing_value)}`, 14, y); y += 5;
  }
  y += 5;

  const auditSteps = [
    ...(comparison.companies_act?.calculation_steps.map((s) => `[Companies Act] ${s}`) ?? []),
    ...(comparison.income_tax?.calculation_steps.map((s) => `[Income Tax] ${s}`) ?? []),
    ...(comparison.generic_wdv?.calculation_steps.map((s) => `[Generic WDV] ${s}`) ?? []),
  ];
  if (auditSteps.length > 0) {
    doc.setFontSize(12);
    doc.text("CALCULATION DETAILS", 14, y);
    y += 6;
    doc.setFontSize(8);
    auditSteps.forEach((step) => {
      const wrapped = doc.splitTextToSize(step, 180);
      if (y > 270) { doc.addPage(); y = 15; }
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4 + 2;
    });
  }

  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(doc.splitTextToSize(DISCLAIMER_TEXT, 180), 14, y + 6);

  doc.save(`${comparison.asset.asset_code}_depreciation_report.pdf`);
}
