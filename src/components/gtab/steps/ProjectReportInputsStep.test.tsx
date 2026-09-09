import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectReportInputsStep from "./ProjectReportInputsStep";
import { INITIAL_FORM_DATA, type GTABFormData } from "@/types/gtab";

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

describe("ProjectReportInputsStep — Bank Finance % is only editable where the backend honours it", () => {
  it("MSME scheme: Bank Finance on Fixed Capital % is a real editable input", () => {
    const formData = baseFormData({ loan_scheme: "normal_msme" as any });
    render(<ProjectReportInputsStep formData={formData} updateFormData={vi.fn()} />);

    expect(screen.getByText("Bank Finance on Fixed Capital %")).toBeTruthy();
    expect(screen.queryByText(/not bank-adjustable/i)).toBeNull();
  });

  it("PMEGP scheme: Bank Finance % shows the scheme-fixed note, not an editable field", () => {
    const formData = baseFormData({ loan_scheme: "pmegp" as any });
    render(<ProjectReportInputsStep formData={formData} updateFormData={vi.fn()} />);

    expect(screen.getByText(/Fixed by PMEGP scheme rules/i)).toBeTruthy();
    expect(screen.getByText(/not bank-adjustable/i)).toBeTruthy();
  });

  it("Mudra scheme: Bank Finance % shows the scheme-fixed note, not an editable field", () => {
    const formData = baseFormData({ loan_scheme: "mudra_kishor" as any });
    render(<ProjectReportInputsStep formData={formData} updateFormData={vi.fn()} />);

    expect(screen.getByText(/Fixed by Mudra scheme rules/i)).toBeTruthy();
  });

  it("CGTMSE scheme: Bank Finance % shows the scheme-fixed note, not an editable field", () => {
    const formData = baseFormData({ loan_scheme: "cgtmse" as any });
    render(<ProjectReportInputsStep formData={formData} updateFormData={vi.fn()} />);

    expect(screen.getByText(/Fixed by CGTMSE scheme rules/i)).toBeTruthy();
  });

  it("Annual Interest Rate % stays editable for every scheme (never scheme-formula-locked)", () => {
    for (const scheme of ["pmegp", "mudra_kishor", "cgtmse", "normal_msme"]) {
      const formData = baseFormData({ loan_scheme: scheme as any });
      const { unmount } = render(<ProjectReportInputsStep formData={formData} updateFormData={vi.fn()} />);
      expect(screen.getByText("Annual Interest Rate %")).toBeTruthy();
      unmount();
    }
  });
});
