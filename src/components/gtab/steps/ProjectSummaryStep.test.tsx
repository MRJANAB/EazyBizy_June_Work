import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectSummaryStep from "./ProjectSummaryStep";
import { INITIAL_FORM_DATA, type GTABFormData } from "@/types/gtab";

const totals = { total_project_cost: 1_000_000, margin_money: 0, eligible_loan_amount: 750_000 };

function baseFormData(overrides: Partial<GTABFormData>): GTABFormData {
  return {
    ...INITIAL_FORM_DATA,
    shed_building_cost: 500_000,
    plant_machinery: [
      { id: "1", machine_name: "M", cost: 500_000, quantity: 1, unit_cost: 500_000, supplier_name: "", supplier_phone: "", supplier_email: "" },
    ],
    ...overrides,
  } as GTABFormData;
}

describe("ProjectSummaryStep — Means of Finance % editability", () => {
  it("MSME scheme: Term Loan % and WC Loan % are real editable inputs that write back via updateFormData", () => {
    const updateFormData = vi.fn();
    const formData = baseFormData({ loan_scheme: "normal_msme" as any, loan_purpose: "term_loan" });
    render(<ProjectSummaryStep formData={formData} updateFormData={updateFormData} totals={totals} />);

    const pctInputs = screen.getAllByRole("spinbutton");
    expect(pctInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(pctInputs[0], { target: { value: "82" } });
    expect(updateFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        project_report_inputs: expect.objectContaining({
          dpr: expect.objectContaining({ term_loan_pct: 82 }),
        }),
      }),
    );
  });

  it("PMEGP scheme: Term Loan % shows the scheme-fixed clarification, not an editable input for it", () => {
    const updateFormData = vi.fn();
    const formData = baseFormData({ loan_scheme: "pmegp" as any, loan_purpose: "term_loan" });
    render(<ProjectSummaryStep formData={formData} updateFormData={updateFormData} totals={totals} />);

    expect(screen.getByText(/fixed by PMEGP scheme rules, not bank-adjustable/i)).toBeTruthy();
  });

  it("PMEGP scheme: WC Loan % is still editable (WC bank-finance % is never scheme-formula-fixed)", () => {
    const updateFormData = vi.fn();
    const formData = baseFormData({ loan_scheme: "pmegp" as any, loan_purpose: "term_loan" });
    render(<ProjectSummaryStep formData={formData} updateFormData={updateFormData} totals={totals} />);

    const pctInputs = screen.getAllByRole("spinbutton");
    // Only the WC % input should be present (Term Loan % is locked for PMEGP).
    expect(pctInputs.length).toBe(1);
    fireEvent.change(pctInputs[0], { target: { value: "70" } });
    expect(updateFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        project_report_inputs: expect.objectContaining({
          dpr: expect.objectContaining({ wc_loan_pct: 70 }),
        }),
      }),
    );
  });
});
