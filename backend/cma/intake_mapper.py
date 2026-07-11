import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator, ValidationInfo

class ApplicantProfile(BaseModel):
    name: str
    father_spouse_name: str
    dob: str
    pan: str
    aadhaar: str
    mobile: str
    email: str
    address: str
    city: str
    state: str
    pincode: str
    education: str
    experience_years: int

class BusinessProfile(BaseModel):
    entity_name: str
    constitution: str  # Proprietorship / Partnership / LLP / Pvt Ltd
    activity: str      # Manufacturing / Trading / Service
    gst_number: str
    udyam_registration: str
    iec: Optional[str] = None
    shop_act: Optional[str] = None
    commencement_date: str

class LoanRequirement(BaseModel):
    purpose: str
    loan_type: str
    scheme: str
    amount: float
    preferred_bank: str
    tenure_months: int
    moratorium_months: int
    interest_rate: float

class Asset(BaseModel):
    name: str
    amount: float

class ProjectCost(BaseModel):
    land: float = 0
    building: float = 0
    plant_machinery: float = 0
    electrical: float = 0
    furniture: float = 0
    computers: float = 0
    vehicles: float = 0
    office_equipment: float = 0
    generator_ups: float = 0
    preliminary_expenses: float = 0
    registration_license: float = 0
    consultancy_fees: float = 0
    marketing_launch: float = 0
    contingency: float = 0
    initial_stock: float = 0
    cash_margin: float = 0
    receivables_support: float = 0

    @property
    def total_cost(self) -> float:
        return (self.land + self.building + self.plant_machinery + self.electrical + 
                self.furniture + self.computers + self.vehicles + self.office_equipment + 
                self.generator_ups + self.preliminary_expenses + self.registration_license + 
                self.consultancy_fees + self.marketing_launch + self.contingency + 
                self.initial_stock + self.cash_margin + self.receivables_support)

class MeansOfFinance(BaseModel):
    promoter_contribution: float
    unsecured_loans: float
    subsidy: float
    term_loan: float
    working_capital_loan: float
    other_funding: float

    @property
    def total_finance(self) -> float:
        # BUG 4 FIX: WC loan is a revolving facility — NOT part of MoF total.
        # MoF must equal ProjectCost exactly: Promoter + Subsidy + TermLoan = ProjectCost
        return (self.promoter_contribution + self.unsecured_loans + self.subsidy +
                self.term_loan + self.other_funding)

    @property
    def total_finance_with_wc(self) -> float:
        """Full funding including WC loan (for total bank exposure reporting only)."""
        return self.total_finance + self.working_capital_loan

class HistoricalFinancial(BaseModel):
    year: str
    sales: float
    purchases: float
    gross_profit: float
    salary: float
    rent: float
    utilities: float
    admin_expenses: float
    marketing: float
    depreciation: float
    interest: float
    tax: float
    pat: float
    cash: float
    debtors: float
    creditors: float
    stock: float
    term_loan_outstanding: float
    wc_outstanding: float
    net_fixed_assets: float = 0
    net_worth: float

class ProductRevenueModel(BaseModel):
    product_name: str
    unit: str
    purchase_cost: float
    selling_price: float
    monthly_qty: float
    growth_pct: float

    @property
    def monthly_revenue(self) -> float:
        return self.selling_price * self.monthly_qty

    @property
    def monthly_cogs(self) -> float:
        return self.purchase_cost * self.monthly_qty

class Manpower(BaseModel):
    designation: str
    headcount: int
    monthly_salary: float
    annual_increment_pct: float

class OperatingExpenses(BaseModel):
    rent: float
    electricity: float
    water: float
    telephone: float
    internet: float
    transport: float
    repair: float
    stationery: float
    marketing: float
    insurance: float
    professional_fees: float
    misc: float

class WCNorms(BaseModel):
    rm_holding_days: int
    wip_days: int
    fg_days: int
    receivable_days: int
    creditor_days: int
    cash_holding_days: int

class NetWorthAsset(BaseModel):
    name: str
    value: float

class PromoterNetWorth(BaseModel):
    residential_property: float = 0
    commercial_property: float = 0
    fd: float = 0
    savings: float = 0
    mutual_funds: float = 0
    shares: float = 0
    gold: float = 0
    other_assets: float = 0
    liabilities: float = 0

    @property
    def net_worth(self) -> float:
        return (self.residential_property + self.commercial_property + self.fd + 
                self.savings + self.mutual_funds + self.shares + self.gold + 
                self.other_assets - self.liabilities)

class CollateralItem(BaseModel):
    type: str = ""
    description: str = ""
    market_value: float = 0
    forced_sale_value: float = 0
    owner: str = ""

class Collateral(BaseModel):
    primary_security: str = ""
    collateral_items: List[CollateralItem] = []
    cgtmse_covered: bool = False
    cgtmse_coverage_pct: float = 0
    insurance_arranged: bool = False

class Guarantor(BaseModel):
    name: str = ""
    relation: str = ""
    net_worth: float = 0

class CARecommendation(BaseModel):
    rating: str = ""            # green / amber / red
    recommendation: str = ""    # Recommend / Conditional / Decline
    notes: str = ""

class CMAIntake(BaseModel):
    applicant: ApplicantProfile
    business: BusinessProfile
    loan: LoanRequirement
    project_cost: ProjectCost
    means_of_finance: MeansOfFinance
    historical_financials: List[HistoricalFinancial] = []
    products: List[ProductRevenueModel]
    manpower: List[Manpower]
    opex: OperatingExpenses
    wc_norms: WCNorms
    # Share of gross sales that is export turnover (rest is domestic). Drives the
    # domestic/export split on Form II and export-receivable context for bankers.
    export_sales_pct: float = 0
    depreciation_rates: Dict[str, float] = {
        "building": 5.0,
        "plant_machinery": 10.0,
        "furniture": 10.0,
        "vehicles": 15.0,
        "computers": 40.0,
        "office_equipment": 10.0
    }
    tax_rate: float = 25.0
    promoter_net_worth: PromoterNetWorth
    guarantor: Optional[Guarantor] = None
    collateral: Optional[Collateral] = None
    ca_recommendation: Optional[CARecommendation] = None
    assumptions: Dict[str, float] = {
        "revenue_growth": 10.0,
        "cogs_growth": 5.0,
        "expense_growth": 5.0,
        "salary_increment": 8.0,
        "interest_change": 0.0
    }

    @field_validator('means_of_finance')
    @classmethod
    def validate_finance_matches_cost(cls, v, info: ValidationInfo):
        # Advisory check only — never block the report generation.
        # CA may intentionally submit an unbalanced MoF draft for review.
        if 'project_cost' in info.data:
            cost = info.data['project_cost'].total_cost
            finance = v.total_finance   # excludes working_capital_loan
            if abs(cost - finance) > 1.0:
                print(
                    f"[CMA Advisory] MoF gap: ₹{abs(cost - finance):,.0f}  "
                    f"(Project Cost ₹{cost:,.0f} vs Finance ₹{finance:,.0f}). "
                    "WC Loan is a revolving facility and must not be included in project MoF."
                )
        return v
