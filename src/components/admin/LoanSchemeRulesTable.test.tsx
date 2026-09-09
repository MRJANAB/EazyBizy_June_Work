import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoanSchemeRulesTable from "./LoanSchemeRulesTable";

const mockRules = [
  {
    id: "r1",
    scheme_id: "pmegp",
    bank_name: null,
    rule_key: "margin_money_subsidy_pct",
    value: { general_urban: 15, general_rural: 25, special_urban: 25, special_rural: 35 },
    effective_date: "2026-01-01",
    source_reference: "KVIC PMEGP Guidelines",
    notes: null,
    active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const fromMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // A single thenable "chain" object: .select()/.order()/.update() all return
  // itself (so any number of chained calls works), and awaiting it at any
  // point resolves to { data: mockRules, error: null } — matches how
  // supabase-js's real query builder is both chainable and awaitable.
  const chain: any = {
    select: () => chain,
    order: () => chain,
    update: (...args: unknown[]) => updateMock(...args) && chain,
    eq: (...args: unknown[]) => eqMock(...args),
    then: (resolve: (v: unknown) => void) => resolve({ data: mockRules, error: null }),
  };
  fromMock.mockReturnValue(chain);
  updateMock.mockReturnValue(chain);
  eqMock.mockResolvedValue({ error: null });
});

describe("LoanSchemeRulesTable", () => {
  it("renders fetched rules with scheme and rule labels", async () => {
    render(<LoanSchemeRulesTable />);
    await waitFor(() => expect(screen.getByText("PMEGP")).toBeTruthy());
    expect(screen.getByText("Margin Money Subsidy %")).toBeTruthy();
    expect(screen.getByText(/general_urban: 15/)).toBeTruthy();
  });

  it("opens the edit dialog with the current JSON value pre-filled", async () => {
    render(<LoanSchemeRulesTable />);
    await waitFor(() => expect(screen.getByText("PMEGP")).toBeTruthy());

    const editButton = screen.getByRole("button");
    fireEvent.click(editButton);

    await waitFor(() => expect(screen.getByText(/PMEGP.*Margin Money Subsidy/)).toBeTruthy());
    const textarea = screen.getByDisplayValue(/general_urban/);
    expect(textarea).toBeTruthy();
  });

  it("shows a JSON parse error instead of saving invalid JSON", async () => {
    render(<LoanSchemeRulesTable />);
    await waitFor(() => expect(screen.getByText("PMEGP")).toBeTruthy());
    fireEvent.click(screen.getByRole("button"));

    const textarea = await screen.findByDisplayValue(/general_urban/);
    fireEvent.change(textarea, { target: { value: "{not valid json" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(screen.getByText(/Not valid JSON/)).toBeTruthy());
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves valid edited JSON via supabase.update", async () => {
    render(<LoanSchemeRulesTable />);
    await waitFor(() => expect(screen.getByText("PMEGP")).toBeTruthy());
    fireEvent.click(screen.getByRole("button"));

    const textarea = await screen.findByDisplayValue(/general_urban/);
    fireEvent.change(textarea, { target: { value: '{"general_urban": 20}' } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: { general_urban: 20 } }),
    ));
    expect(eqMock).toHaveBeenCalledWith("id", "r1");
  });
});
