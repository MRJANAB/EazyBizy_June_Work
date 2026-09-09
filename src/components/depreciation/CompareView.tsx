import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DepreciationComparison, DISCLAIMER_TEXT } from "@/types/depreciation";
import { BookBadge, TaxBadge, GenericBadge } from "./DepreciationBadges";
import { exportComparisonCsv, exportComparisonPdf } from "@/lib/depreciation/exportReport";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function CompareView({ comparison }: { comparison: DepreciationComparison }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">DEPRECIATION COMPARISON</h3>
          <p className="text-sm text-muted-foreground">
            Asset: {comparison.asset.asset_name} · Asset ID: {comparison.asset.asset_code} · FY: {comparison.financial_year}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportComparisonCsv(comparison)}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportComparisonPdf(comparison)}>Export PDF</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Particular</TableHead>
              <TableHead><BookBadge /> Companies Act</TableHead>
              <TableHead><TaxBadge /> Income Tax</TableHead>
              <TableHead><GenericBadge /> Generic WDV</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.rows.map((row) => (
              <TableRow key={row.particular}>
                <TableCell className="font-medium">{row.particular}</TableCell>
                <TableCell>{row.companies_act}</TableCell>
                <TableCell>{row.income_tax}</TableCell>
                <TableCell>{row.generic_wdv}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
        <p className="text-sm font-bold">BOOK vs TAX DEPRECIATION — not interchangeable</p>
        {comparison.differences.book_vs_tax_depreciation !== undefined ? (
          <>
            <p className="text-sm">
              Difference in Current-Year Depreciation (<BookBadge /> − <TaxBadge />): <strong>{fmt(comparison.differences.book_vs_tax_depreciation)}</strong>
            </p>
            <p className="text-sm">
              Difference in Closing Value (<BookBadge /> Carrying Value − <TaxBadge /> WDV): <strong>{fmt(comparison.differences.book_vs_tax_closing_value!)}</strong>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Configure both Companies Act and Income Tax to see the Book vs Tax difference.</p>
        )}
        {comparison.differences.current_year_depreciation_ca_vs_generic !== undefined && (
          <p className="text-sm">
            Difference vs <GenericBadge /> Generic WDV: <strong>{fmt(comparison.differences.current_year_depreciation_ca_vs_generic)}</strong> (depreciation), <strong>{fmt(comparison.differences.closing_value_ca_vs_generic!)}</strong> (closing value)
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">{DISCLAIMER_TEXT}</p>
    </div>
  );
}
