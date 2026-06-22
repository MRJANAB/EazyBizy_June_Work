/**
 * Indian Government Loan Rules Engine
 * Validates applicant, industry inputs, scheme eligibility, and financial metrics
 * for PMEGP, Mudra, CGTMSE, and MSME PSU Bank schemes
 */

import type { GTABSocialCategory, GTABIndustryType, GTABLoanScheme } from '@/types/gtab';

export interface ApplicantData {
  full_name: string;
  fathers_name: string;
  date_of_birth: string;
  gender: string;
  educational_qual: string;
  social_category: GTABSocialCategory;
  pan_number: string;
  aadhaar_number: string;
  mobile_number: string;
  address: string;
  existing_borrower?: boolean;
  repaid_previous_mudra?: boolean;
  rural_urban?: 'rural' | 'urban';
}

export interface IndustryInputs {
  industry_type: GTABIndustryType;
  
  // Manufacturing
  raw_materials_annual?: number;
  machinery_cost?: number;
  production_capacity?: number;
  working_days?: number;
  power_cost_monthly?: number;
  labour_cost_monthly?: number;
  inventory_days?: number;
  debtor_days?: number;
  creditor_days?: number;
  
  // Service
  employee_cost_monthly?: number;
  rent_monthly?: number;
  utilities_monthly?: number;
  software_tools_cost?: number;
  monthly_recurring_revenue?: number;
  
  // Trading
  inventory_purchase_cost?: number;
  stock_holding_days?: number;
  supplier_credit_days?: number;
  sales_turnover_monthly?: number;
  gross_margin_pct?: number;
  
  // Agriculture
  crop_type?: string;
  land_owned?: number;
  land_leased?: number;
  seasonal_cycle_months?: number;
  irrigation_cost?: number;
  fertilizer_cost?: number;
  labour_cost?: number;
  harvest_yield_units?: number;
}

export interface SchemeDetails {
  loan_scheme: GTABLoanScheme;
  loan_amount_requested: number;
  promoter_contribution: number;
  project_cost: number;
  industry_type: GTABIndustryType;
  is_second_loan?: boolean;
  area_type?: 'urban' | 'rural';
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SchemeEligibilityResult extends ValidationResult {
  eligible: boolean;
  scheme_name: string;
  loan_amount_range: [number, number];
  subsidy_percentage?: number;
  subsidy_amount?: number;
  bank_finance_amount?: number;
  margin_money_amount?: number;
  promoter_contribution_required?: number;
}

export interface FinancialRatioResult {
  debt_equity_ratio: number;
  dscr: number; // Debt Service Coverage Ratio
  roe: number; // Return on Equity
  current_ratio: number;
  gross_margin: number;
}

export interface BankScoreResult {
  credit_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  recommendation: string;
}

// ============================================================================
// INDUSTRY FIELD REQUIREMENTS
// ============================================================================

const INDUSTRY_REQUIRED_FIELDS: Record<GTABIndustryType, string[]> = {
  manufacturing: [
    'raw_materials_annual',
    'machinery_cost',
    'production_capacity',
    'working_days',
    'power_cost_monthly',
    'labour_cost_monthly',
    'inventory_days',
    'debtor_days',
    'creditor_days',
  ],
  service: [
    'employee_cost_monthly',
    'rent_monthly',
    'utilities_monthly',
    'software_tools_cost',
    'monthly_recurring_revenue',
  ],
  trading: [
    'inventory_purchase_cost',
    'stock_holding_days',
    'supplier_credit_days',
    'sales_turnover_monthly',
    'gross_margin_pct',
  ],
  agriculture: [
    'crop_type',
    'land_owned',
    'seasonal_cycle_months',
    'irrigation_cost',
    'labour_cost',
    'harvest_yield_units',
  ],
  others: [],
};

// ============================================================================
// LOAN SCHEME RULES
// ============================================================================

const LOAN_SCHEME_RULES: Record<GTABLoanScheme, {
  min_amount: number;
  max_amount: number;
  requires_cma: boolean;
  requires_collateral: boolean;
  requires_guarantor: boolean;
  industries_allowed: GTABIndustryType[];
  min_promoter_contribution_pct: number;
}> = {
  mudra: {
    min_amount: 50001,
    max_amount: 500000,
    requires_cma: true,
    requires_collateral: false,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 10,
  },
  mudra_shishu: {
    min_amount: 0,
    max_amount: 50000,
    requires_cma: false,
    requires_collateral: false,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 10,
  },
  mudra_kishor: {
    min_amount: 50001,
    max_amount: 500000,
    requires_cma: true,
    requires_collateral: false,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 10,
  },
  mudra_tarun: {
    min_amount: 500001,
    max_amount: 1000000,
    requires_cma: true,
    requires_collateral: false,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 20,
  },
  mudra_tarunplus: {
    min_amount: 1000001,
    max_amount: 2000000,
    requires_cma: true,
    requires_collateral: false,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 20,
  },
  pmegp: {
    min_amount: 100000,
    max_amount: 50000000, // Will be validated by industry in validation function
    requires_cma: true,
    requires_collateral: true,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service'], // PMEGP only supports Mfg & Service
    min_promoter_contribution_pct: 5, // Will be calculated based on subsidy
  },
  cgtmse: {
    min_amount: 100000,
    max_amount: 2000000,
    requires_cma: true,
    requires_collateral: false,
    requires_guarantor: true,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 0,
  },
  normal_msme: {
    min_amount: 100000,
    max_amount: 10000000,
    requires_cma: true,
    requires_collateral: true,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture'],
    min_promoter_contribution_pct: 15,
  },
  other_scheme: {
    min_amount: 100000,
    max_amount: 10000000,
    requires_cma: true,
    requires_collateral: true,
    requires_guarantor: false,
    industries_allowed: ['manufacturing', 'service', 'trading', 'agriculture', 'others'],
    min_promoter_contribution_pct: 20,
  },
};

// PMEGP Subsidy Rules
const PMEGP_SUBSIDY_RULES = {
  general_rural: 0.25,         // 25% subsidy
  general_urban: 0.15,          // 15% subsidy
  special_rural: 0.35,           // 35% subsidy
  special_urban: 0.25,           // 25% subsidy
};

// PMEGP Project Cost Limits (2024)
const PMEGP_PROJECT_LIMITS = {
  manufacturing: {
    first_loan: 5000000,    // ₹50 lakhs
    second_loan: 10000000,  // ₹1 crore
  },
  service: {
    first_loan: 2000000,    // ₹20 lakhs
    second_loan: 3000000,   // ₹30 lakhs
  },
};

// ============================================================================
// PMEGP CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate PMEGP subsidy amount
 */
export function calculatePMEGPSubsidy(
  projectCost: number,
  applicantCategory: GTABSocialCategory,
  areaType: 'urban' | 'rural'
): number {
  let subsidyRate = 0;

  if (areaType === 'rural') {
    subsidyRate = applicantCategory === 'general'
      ? PMEGP_SUBSIDY_RULES.general_rural
      : PMEGP_SUBSIDY_RULES.special_rural;
  } else {
    subsidyRate = applicantCategory === 'general'
      ? PMEGP_SUBSIDY_RULES.general_urban
      : PMEGP_SUBSIDY_RULES.special_urban;
  }

  return Math.round(projectCost * subsidyRate);
}

/**
 * Calculate PMEGP margin money (promoter contribution)
 */
export function calculatePMEGPMarginMoney(
  projectCost: number,
  subsidyAmount: number
): number {
  // Margin money = Project Cost - Subsidy
  return projectCost - subsidyAmount;
}

/**
 * Calculate PMEGP bank finance amount
 */
export function calculatePMEGPBankFinance(
  projectCost: number,
  marginMoney: number
): number {
  // Bank finance = Project Cost - Margin Money
  return projectCost - marginMoney;
}

/**
 * Validate PMEGP project cost eligibility
 */
export function validatePMEGPProjectCost(
  projectCost: number,
  industryType: GTABIndustryType,
  isSecondLoan: boolean = false
): { isValid: boolean; maxLimit: number; errors: string[] } {
  const errors: string[] = [];
  const limits = PMEGP_PROJECT_LIMITS[industryType as keyof typeof PMEGP_PROJECT_LIMITS];

  if (!limits) {
    return {
      isValid: false,
      maxLimit: 0,
      errors: ['PMEGP only supports manufacturing and service industries']
    };
  }

  const maxLimit = isSecondLoan ? limits.second_loan : limits.first_loan;

  if (projectCost > maxLimit) {
    errors.push(
      `PMEGP ${industryType} project cost exceeds limit of ₹${maxLimit.toLocaleString()}`
    );
  }

  if (projectCost < 100000) {
    errors.push('PMEGP minimum project cost is ₹1 lakh');
  }

  return {
    isValid: errors.length === 0,
    maxLimit,
    errors
  };
}

/**
 * Validate PMEGP promoter contribution
 */
export function validatePMEGPPromoterContribution(
  marginMoney: number,
  projectCost: number
): { isValid: boolean; requiredPct: number; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredMarginMoney = marginMoney;
  const requiredPct = (requiredMarginMoney / projectCost) * 100;

  // PMEGP requires promoter to contribute the margin money (project cost - subsidy)
  if (requiredMarginMoney <= 0) {
    errors.push('Invalid margin money calculation');
  }

  // Check if promoter contribution is sufficient
  const minContributionPct = Math.max(5, requiredPct); // At least 5% or calculated margin

  if (requiredPct < 5) {
    warnings.push('Promoter contribution is less than 5% of project cost');
  }

  return {
    isValid: errors.length === 0,
    requiredPct: Math.round(requiredPct * 100) / 100,
    errors,
    warnings
  };
}

/**
 * Generate complete PMEGP loan breakdown
 */
export function generatePMEGPLoanBreakdown(
  projectCost: number,
  industryType: GTABIndustryType,
  applicantCategory: GTABSocialCategory,
  areaType: 'urban' | 'rural',
  isSecondLoan: boolean = false
): {
  isEligible: boolean;
  subsidyAmount: number;
  marginMoney: number;
  bankFinance: number;
  promoterContributionPct: number;
  validationErrors: string[];
  validationWarnings: string[];
} {
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  // Validate project cost
  const projectValidation = validatePMEGPProjectCost(projectCost, industryType, isSecondLoan);
  if (!projectValidation.isValid) {
    validationErrors.push(...projectValidation.errors);
  }

  // Calculate subsidy
  const subsidyAmount = calculatePMEGPSubsidy(projectCost, applicantCategory, areaType);

  // Calculate margin money
  const marginMoney = calculatePMEGPMarginMoney(projectCost, subsidyAmount);

  // Calculate bank finance
  const bankFinance = calculatePMEGPBankFinance(projectCost, marginMoney);

  // Validate promoter contribution
  const contributionValidation = validatePMEGPPromoterContribution(marginMoney, projectCost);
  if (!contributionValidation.isValid) {
    validationErrors.push(...contributionValidation.errors);
  }
  validationWarnings.push(...contributionValidation.warnings);

  return {
    isEligible: validationErrors.length === 0,
    subsidyAmount,
    marginMoney,
    bankFinance,
    promoterContributionPct: contributionValidation.requiredPct,
    validationErrors,
    validationWarnings,
  };
}

// ============================================================================
// MUDRA SCHEME VALIDATION FUNCTIONS
// ============================================================================

/**
 * Get Mudra scheme details by loan amount
 */
export function getMudraSchemeByAmount(amount: number): GTABLoanScheme | null {
  if (amount <= 50000) return 'mudra_shishu';
  if (amount <= 500000) return 'mudra_kishor';
  if (amount <= 1000000) return 'mudra_tarun';
  if (amount <= 2000000) return 'mudra_tarunplus';
  return null;
}

/**
 * Validate Mudra scheme eligibility
 */
export function validateMudraEligibility(
  scheme: GTABLoanScheme,
  loanAmount: number,
  applicant: ApplicantData,
  industryType: GTABIndustryType,
  financialRatios?: FinancialRatioResult
): {
  isEligible: boolean;
  scheme: GTABLoanScheme;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Validate scheme is Mudra
  const mudraSchemes = ['mudra_shishu', 'mudra_kishor', 'mudra_tarun', 'mudra_tarunplus'];
  if (!mudraSchemes.includes(scheme)) {
    errors.push('Invalid scheme for Mudra validation');
    return { isEligible: false, scheme, errors, warnings, recommendations };
  }

  // Validate loan amount ranges
  const rules = LOAN_SCHEME_RULES[scheme];
  if (loanAmount < rules.min_amount || loanAmount > rules.max_amount) {
    errors.push(`Loan amount ₹${loanAmount.toLocaleString()} is outside Mudra ${scheme.replace('mudra_', '').toUpperCase()} range (₹${rules.min_amount.toLocaleString()} - ₹${rules.max_amount.toLocaleString()})`);
  }

  // Validate industry support
  if (!rules.industries_allowed.includes(industryType)) {
    errors.push(`${industryType} industry is not eligible for Mudra schemes`);
  }

  // Mudra Tarun Plus specific validations
  if (scheme === 'mudra_tarunplus') {
    if (!applicant.repaid_previous_mudra) {
      errors.push('Mudra Tarun Plus requires successful repayment of previous Mudra Tarun loan');
      recommendations.push('Apply for Mudra Tarun first and successfully repay before applying for Tarun Plus');
    }
  }

  // Financial ratio warnings
  if (financialRatios) {
    if (financialRatios.dscr < 1.25) {
      warnings.push('DSCR below 1.25 indicates weak debt service capacity');
      recommendations.push('Improve cash flow projections or reduce loan amount');
    }

    if (financialRatios.current_ratio < 1.33) {
      warnings.push('Current ratio below 1.33 indicates liquidity concerns');
      recommendations.push('Strengthen working capital or improve current assets');
    }

    if (financialRatios.gross_margin < 15) {
      warnings.push('Gross margin below 15% indicates weak profitability');
      recommendations.push('Review pricing strategy or cost structure');
    }
  }

  // Age-based warnings
  const dob = new Date(applicant.date_of_birth);
  const age = new Date().getFullYear() - dob.getFullYear();
  if (age < 21) {
    warnings.push('Applicant under 21 years may face additional scrutiny');
  }
  if (age > 65) {
    warnings.push('Applicant over 65 years may have repayment capacity concerns');
  }

  return {
    isEligible: errors.length === 0,
    scheme,
    errors,
    warnings,
    recommendations,
  };
}

/**
 * Comprehensive Mudra scheme checker
 */
export function checkMudraSchemeEligibility(
  loanAmount: number,
  applicant: ApplicantData,
  industryType: GTABIndustryType,
  financialRatios?: FinancialRatioResult
): {
  recommendedScheme: GTABLoanScheme | null;
  isEligible: boolean;
  alternatives: GTABLoanScheme[];
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const alternatives: GTABLoanScheme[] = [];

  // Determine recommended scheme based on loan amount
  const recommendedScheme = getMudraSchemeByAmount(loanAmount);

  if (!recommendedScheme) {
    errors.push(`Loan amount ₹${loanAmount.toLocaleString()} exceeds maximum Mudra limit of ₹20 lakhs`);
    recommendations.push('Consider PMEGP scheme for amounts above ₹20 lakhs');
    recommendations.push('Consider CGTMSE scheme for collateral-free loans up to ₹20 lakhs');
    return {
      recommendedScheme: null,
      isEligible: false,
      alternatives: [],
      errors,
      warnings,
      recommendations,
    };
  }

  // Validate eligibility for recommended scheme
  const validation = validateMudraEligibility(
    recommendedScheme,
    loanAmount,
    applicant,
    industryType,
    financialRatios
  );

  errors.push(...validation.errors);
  warnings.push(...validation.warnings);
  recommendations.push(...validation.recommendations);

  // Suggest alternatives if current scheme not eligible
  if (!validation.isEligible) {
    // Try lower schemes
    const schemeHierarchy: GTABLoanScheme[] = ['mudra_shishu', 'mudra_kishor', 'mudra_tarun', 'mudra_tarunplus'];
    const currentIndex = schemeHierarchy.indexOf(recommendedScheme);

    for (let i = currentIndex - 1; i >= 0; i--) {
      const altScheme = schemeHierarchy[i];
      const altValidation = validateMudraEligibility(
        altScheme,
        loanAmount,
        applicant,
        industryType,
        financialRatios
      );
      if (altValidation.isEligible) {
        alternatives.push(altScheme);
      }
    }
  }

  return {
    recommendedScheme: validation.isEligible ? recommendedScheme : null,
    isEligible: validation.isEligible,
    alternatives,
    errors,
    warnings,
    recommendations,
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate applicant eligibility criteria
 */
export function validateApplicant(applicant: ApplicantData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Age validation (minimum 18 years)
  const dob = new Date(applicant.date_of_birth);
  const age = new Date().getFullYear() - dob.getFullYear();
  if (age < 18) {
    errors.push('Applicant must be at least 18 years old');
  }
  if (age > 65) {
    warnings.push('Applicant is above 65 years; age may affect loan sanctioning');
  }

  // PAN validation
  if (!applicant.pan_number || applicant.pan_number.length < 10) {
    errors.push('Valid PAN number is required');
  }

  // Aadhaar validation
  if (!applicant.aadhaar_number || applicant.aadhaar_number.length !== 12) {
    errors.push('Valid 12-digit Aadhaar number is required');
  }

  // Mobile validation
  if (!applicant.mobile_number || applicant.mobile_number.length !== 10) {
    errors.push('Valid 10-digit mobile number is required');
  }

  // Existing borrower checks
  if (applicant.existing_borrower && !applicant.repaid_previous_mudra) {
    warnings.push('Existing borrower; ensure previous loans are satisfactorily repaid');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate industry-specific inputs
 */
export function validateIndustryInputs(
  industry: GTABIndustryType,
  inputs: IndustryInputs
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields = INDUSTRY_REQUIRED_FIELDS[industry] || [];

  // Check all required fields are present and valid
  for (const field of requiredFields) {
    const value = inputs[field as keyof IndustryInputs];
    
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} is required for ${industry} industry`);
    }
    
    if (typeof value === 'number' && value < 0) {
      errors.push(`${field} cannot be negative`);
    }
  }

  // Industry-specific validations
  if (industry === 'manufacturing') {
    if (inputs.production_capacity && inputs.working_days) {
      const capacity = (inputs.production_capacity || 0) / (inputs.working_days || 1);
      if (capacity < 10) {
        warnings.push(
          'Production capacity per working day seems low; verify feasibility'
        );
      }
    }
    if (inputs.inventory_days && inputs.inventory_days > 90) {
      warnings.push('High inventory holding days; consider reducing working capital needs');
    }
  }

  if (industry === 'service') {
    const monthlyRevenue = inputs.monthly_recurring_revenue || 0;
    const employeeCost = inputs.employee_cost_monthly || 0;
    if (monthlyRevenue > 0 && employeeCost > 0) {
      const employeeCostRatio = employeeCost / monthlyRevenue;
      if (employeeCostRatio > 0.6) {
        warnings.push(
          'Employee cost as percentage of revenue is high (>60%); verify margins'
        );
      }
    }
  }

  if (industry === 'trading') {
    if (inputs.gross_margin_pct && inputs.gross_margin_pct < 5) {
      errors.push('Gross margin must be at least 5%');
    }
    if (inputs.gross_margin_pct && inputs.gross_margin_pct > 50) {
      warnings.push(
        'Gross margin appears high (>50%); verify market conditions'
      );
    }
  }

  if (industry === 'agriculture') {
    if (inputs.seasonal_cycle_months && inputs.seasonal_cycle_months > 12) {
      errors.push('Seasonal cycle cannot exceed 12 months');
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate scheme eligibility
 */
export function validateSchemeEligibility(
  scheme: GTABLoanScheme,
  details: SchemeDetails,
  applicantSocialCategory: GTABSocialCategory,
  isRural: boolean,
  financialRatios?: FinancialRatioResult
): SchemeEligibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let eligible = true;
  let subsidy_percentage: number | undefined;
  let subsidy_amount: number | undefined;
  let bank_finance_amount: number | undefined;

  const rules = LOAN_SCHEME_RULES[scheme];
  if (!rules) {
    return {
      is_valid: false,
      eligible: false,
      errors: ['Unknown loan scheme'],
      warnings: [],
      scheme_name: scheme,
      loan_amount_range: [0, 0],
    };
  }

  // Check loan amount range
  if (
    details.loan_amount_requested < rules.min_amount ||
    details.loan_amount_requested > rules.max_amount
  ) {
    errors.push(
      `Loan amount must be between Rs.${rules.min_amount} and Rs.${rules.max_amount}`
    );
    eligible = false;
  }

  // Check industry eligibility
  if (!rules.industries_allowed.includes(details.industry_type)) {
    errors.push(
      `${details.industry_type} industry is not eligible for ${scheme} scheme`
    );
    eligible = false;
  }

  // Check promoter contribution
  const promoterContributionPct =
    (details.promoter_contribution / details.project_cost) * 100;
  if (promoterContributionPct < rules.min_promoter_contribution_pct) {
    errors.push(
      `Promoter contribution must be at least ${rules.min_promoter_contribution_pct}%`
    );
    eligible = false;
  }

  // PMEGP-specific rules
  if (scheme === 'pmegp') {
    // Validate industry support
    if (!['manufacturing', 'service'].includes(details.industry_type)) {
      errors.push('PMEGP only supports manufacturing and service industries');
      eligible = false;
    }

    // Get PMEGP-specific data
    const isSecondLoan = details.is_second_loan || false;
    const areaType = details.area_type || 'urban';

    // Validate project cost limits
    const projectValidation = validatePMEGPProjectCost(
      details.project_cost,
      details.industry_type as GTABIndustryType,
      isSecondLoan
    );

    if (!projectValidation.isValid) {
      errors.push(...projectValidation.errors);
      eligible = false;
    }

    // Calculate PMEGP breakdown
    const pmegpBreakdown = generatePMEGPLoanBreakdown(
      details.project_cost,
      details.industry_type as GTABIndustryType,
      applicantSocialCategory,
      areaType,
      isSecondLoan
    );

    // Add validation warnings
    warnings.push(...pmegpBreakdown.validationWarnings);

    // Check if promoter contribution meets requirements
    const requiredContribution = pmegpBreakdown.marginMoney;
    if (details.promoter_contribution < requiredContribution) {
      errors.push(
        `Promoter contribution must be at least ₹${requiredContribution.toLocaleString()} (${pmegpBreakdown.promoterContributionPct}% of project cost)`
      );
      eligible = false;
    }

    // Calculate subsidy based on category and location
    subsidy_percentage = 0; // Will be calculated as amount, not percentage
    subsidy_amount = pmegpBreakdown.subsidyAmount;

    // Set bank finance amount
    bank_finance_amount = pmegpBreakdown.bankFinance;
  }

  // Mudra scheme validations
  if (scheme.startsWith('mudra_')) {
    // Validate loan amount is within scheme limits
    if (details.loan_amount_requested < rules.min_amount || details.loan_amount_requested > rules.max_amount) {
      errors.push(`Loan amount ₹${details.loan_amount_requested.toLocaleString()} is invalid for ${scheme.toUpperCase()} (₹${rules.min_amount.toLocaleString()} - ₹${rules.max_amount.toLocaleString()})`);
      eligible = false;
    }

    // Mudra Tarun Plus requires previous Mudra Tarun repayment
    if (scheme === 'mudra_tarunplus') {
      // This check would be done against applicant history
      warnings.push('Applicant must have successfully repaid previous Mudra Tarun loan');
    }

    // Add financial ratio warnings for Mudra schemes
    if (financialRatios) {
      if (financialRatios.dscr < 1.25) {
        warnings.push('DSCR below 1.25 may affect loan approval for Mudra schemes');
      }

      if (financialRatios.current_ratio < 1.33) {
        warnings.push('Current ratio below 1.33 indicates potential liquidity issues');
      }

      if (financialRatios.gross_margin < 15) {
        warnings.push('Gross margin below 15% suggests weak repayment capacity');
      }
    }
  }

  // CMA requirement check
  if (rules.requires_cma) {
    if (details.loan_amount_requested <= 50000) {
      warnings.push('CMA required for this loan amount');
    }
  }

  return {
    is_valid: errors.length === 0,
    eligible,
    errors,
    warnings,
    scheme_name: scheme,
    loan_amount_range: [rules.min_amount, rules.max_amount],
    subsidy_percentage,
    subsidy_amount,
    bank_finance_amount,
    margin_money_amount: subsidy_amount ? details.project_cost - subsidy_amount : undefined,
    promoter_contribution_required: subsidy_amount ? details.project_cost - subsidy_amount : undefined,
  };
}

/**
 * Calculate key financial ratios from project data for live wizard validation.
 * Authoritative calculations (5-year P&L, DSCR, BS) are done by the Python backend.
 * These ratios are preview-only — used for real-time CA guidance in the wizard.
 */
export function calculateFinancialRatios(
  projectCost: number,
  loanAmount: number,
  promoterContribution: number,
  annualRevenue: number,
  annualExpense: number,
  annualDebtRepayment: number,
  currentAssets: number = 0,
  currentLiabilities: number = 0,
): FinancialRatioResult {
  const equity       = promoterContribution;
  const annualProfit = annualRevenue - annualExpense;

  return {
    debt_equity_ratio: equity > 0 ? loanAmount / equity : 0,
    // CA DSCR: (Revenue − Operating Expense) / Annual Debt Service (EMI × 12)
    dscr: annualDebtRepayment > 0 ? annualProfit / annualDebtRepayment : 0,
    roe:  equity > 0 ? (annualProfit / equity) * 100 : 0,
    current_ratio: currentLiabilities > 0
      ? currentAssets / currentLiabilities
      : currentAssets > 0 ? 1 : 0,
    gross_margin: annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0,
  };
}

/**
 * Validate financial ratios against bank standards
 */
export function validateFinancialRatios(ratios: FinancialRatioResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Debt-to-Equity Ratio (should be <= 2:1 for safety)
  if (ratios.debt_equity_ratio > 3) {
    errors.push('Debt-to-Equity ratio is too high (>3); project is over-leveraged');
  } else if (ratios.debt_equity_ratio > 2) {
    warnings.push('Debt-to-Equity ratio is high (2-3); higher risk project');
  }

  // DSCR (should be >= 1.25 for safe loan repayment)
  if (ratios.dscr < 1) {
    errors.push('DSCR < 1.0; project cannot service debt from operations');
  } else if (ratios.dscr < 1.25) {
    warnings.push('DSCR < 1.25; margin for debt repayment is tight');
  }

  // ROE (should be reasonable, >15% is good)
  if (ratios.roe < 5) {
    errors.push('ROE < 5%; project profitability is questionable');
  } else if (ratios.roe < 15) {
    warnings.push('ROE < 15%; modest returns for equity investor');
  }

  // Current Ratio (1.5 to 2.0 is ideal)
  if (ratios.current_ratio < 1) {
    errors.push('Current Ratio < 1; insufficient current assets to cover liabilities');
  } else if (ratios.current_ratio < 1.5) {
    warnings.push('Current Ratio < 1.5; working capital situation could be tighter');
  }

  // Gross Margin (>20% is healthy for most businesses)
  if (ratios.gross_margin < 10) {
    errors.push('Gross margin < 10%; project margins are very thin');
  } else if (ratios.gross_margin < 20) {
    warnings.push('Gross margin < 20%; moderate margins');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate warnings based on all validations
 */
export function generateWarnings(
  applicantValidation: ValidationResult,
  industryValidation: ValidationResult,
  schemeValidation: SchemeEligibilityResult,
  ratioValidation: ValidationResult
): string[] {
  const allWarnings = new Set<string>();

  [
    applicantValidation.warnings,
    industryValidation.warnings,
    schemeValidation.warnings,
    ratioValidation.warnings,
  ].forEach((warnings) => warnings.forEach((w) => allWarnings.add(w)));

  return Array.from(allWarnings);
}

// ============================================================================
// BUSINESS RULE VALIDATION (lender-grade sanity checks)
// ============================================================================

/**
 * Validate business-level sanity rules — detects fake/unrealistic inputs.
 * Called on GTABFormData directly so it can cross-check multiple fields.
 */
export function validateBusinessRules(formData: {
  business_entity_name?: string;
  industry_type?: GTABIndustryType;
  expected_monthly_revenue?: number;
  total_monthly_expenses?: number;
  total_monthly_salary?: number;
  skilled_workers_count?: number;
  semi_skilled_workers_count?: number;
  wages_count?: number;
  employee_count?: number;
  electricity_water_cost?: number;
  production_capacity_units?: number;
  gross_margin?: number;
  project_report_inputs?: { promoter?: { years_experience?: number } };
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Business name gibberish check
  const bname = (formData.business_entity_name || '').trim();
  if (bname.length > 0) {
    if (bname.length < 3) {
      errors.push('Business name is too short — minimum 3 characters required');
    }
    if (/^[^a-zA-Z]*$/.test(bname)) {
      errors.push('Business name must contain at least one letter');
    }
    if (/^(.)\1{4,}$/.test(bname)) {
      errors.push('Business name appears to be gibberish (repeated characters)');
    }
    if (/^(test|abc|xyz|dummy|fake|sample|asdf|qwerty)/i.test(bname)) {
      errors.push('Business name appears to be a test/placeholder value');
    }
  }

  // 2. Zero experience warning
  const exp = formData.project_report_inputs?.promoter?.years_experience ?? -1;
  if (exp === 0) {
    warnings.push('Promoter has zero years of experience — bank may ask for additional justification');
  }

  // 3. Zero total wages with employees present
  const totalEmployees =
    (formData.skilled_workers_count || 0) +
    (formData.semi_skilled_workers_count || 0) +
    (formData.wages_count || 0) +
    (formData.employee_count || 0);
  const totalSalary = formData.total_monthly_salary || 0;
  if (totalEmployees > 0 && totalSalary === 0) {
    errors.push(`${totalEmployees} employee(s) listed but total monthly salary is zero — wages must be specified`);
  }

  // 4. Manufacturing: zero power cost
  if (formData.industry_type === 'manufacturing') {
    if (!formData.electricity_water_cost || formData.electricity_water_cost === 0) {
      warnings.push('Manufacturing unit with zero electricity/power cost — verify operational expenses');
    }

    // 5. Zero production capacity with positive revenue
    const rev = formData.expected_monthly_revenue || 0;
    const cap = formData.production_capacity_units || 0;
    if (cap === 0 && rev > 0) {
      warnings.push('Production capacity is zero but monthly revenue is positive — add production parameters in Step 9');
    }
  }

  // 6. Impossible gross margin for trading
  if (formData.industry_type === 'trading') {
    const gm = formData.gross_margin || 0;
    if (gm > 80) {
      errors.push(`Gross margin of ${gm}% is unrealistic for trading — maximum credible is ~80%`);
    }
  }

  // 7. All-zero cash flow check
  const rev = formData.expected_monthly_revenue || 0;
  const exp2 = formData.total_monthly_expenses || 0;
  if (rev === 0 && exp2 === 0 && totalEmployees > 0) {
    errors.push('Revenue and expenses are both zero — financial projections cannot be generated');
  }

  // 8. Revenue less than expenses warning
  if (rev > 0 && exp2 > 0 && exp2 >= rev * 1.2) {
    warnings.push('Monthly expenses exceed revenue by >20% — business may not be viable at current cost structure');
  }

  return { is_valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// BANK SCORING ENGINE — Indian lender-grade (85+/70-84/55-69/<55)
// ============================================================================

/**
 * Generate comprehensive bank score (0-100) with Indian bank score bands.
 *
 * Bands:
 *   85+    → STRONGLY APPROVE
 *   70–84  → APPROVE
 *   55–69  → REVIEW
 *   <55    → REJECT
 */
export function generateBankScore(
  applicantValidation: ValidationResult,
  industryValidation: ValidationResult,
  schemeValidation: SchemeEligibilityResult,
  ratios: FinancialRatioResult,
  applicantAge: number,
  yearsInBusiness: number = 0
): BankScoreResult {
  // Start from 100 and deduct for risk factors
  let score = 100;

  // ── Error penalties ────────────────────────────────────────────────────────
  score -= applicantValidation.errors.length * 12;   // KYC errors are serious
  score -= industryValidation.errors.length * 8;     // Business validity
  score -= schemeValidation.errors.length * 6;       // Scheme eligibility

  // ── Warning penalties ─────────────────────────────────────────────────────
  score -= applicantValidation.warnings.length * 3;
  score -= industryValidation.warnings.length * 2;
  score -= schemeValidation.warnings.length * 2;

  // ── DSCR — most critical metric for Indian banks ─────────────────────────
  if (ratios.dscr >= 1.5)       { /* No deduction — strong */ }
  else if (ratios.dscr >= 1.25) { score -= 5; }
  else if (ratios.dscr >= 1.0)  { score -= 15; }
  else                          { score -= 25; } // DSCR < 1 = cannot repay

  // ── Debt-Equity ratio ─────────────────────────────────────────────────────
  if (ratios.debt_equity_ratio <= 2)      { /* OK */ }
  else if (ratios.debt_equity_ratio <= 3) { score -= 8; }
  else                                    { score -= 15; }

  // ── Gross margin ─────────────────────────────────────────────────────────
  if (ratios.gross_margin >= 25)      { /* Good */ }
  else if (ratios.gross_margin >= 15) { score -= 4; }
  else if (ratios.gross_margin >= 10) { score -= 8; }
  else                                { score -= 12; }

  // ── Current ratio ────────────────────────────────────────────────────────
  if (ratios.current_ratio >= 1.5)     { /* OK */ }
  else if (ratios.current_ratio >= 1.0) { score -= 5; }
  else                                  { score -= 12; }

  // ── Promoter contribution (ROE proxy) ─────────────────────────────────────
  if (ratios.roe >= 20)      { /* Good */ }
  else if (ratios.roe >= 10) { score -= 3; }
  else if (ratios.roe >= 5)  { score -= 6; }
  else                       { score -= 10; }

  // ── Applicant age ─────────────────────────────────────────────────────────
  if (applicantAge < 21)      { score -= 10; }
  else if (applicantAge < 25) { score -= 5; }
  else if (applicantAge > 65) { score -= 5; }
  else if (applicantAge > 60) { score -= 3; }

  // ── Business / industry experience ────────────────────────────────────────
  if (yearsInBusiness >= 5)      { score += 3; }   // Bonus for proven track record
  else if (yearsInBusiness >= 3) { /* neutral */ }
  else if (yearsInBusiness >= 1) { score -= 3; }
  else                           { score -= 8; }   // New business — higher risk

  score = Math.max(0, Math.min(100, score));

  // ── Score bands → recommendation ─────────────────────────────────────────
  let risk_level: 'low' | 'medium' | 'high' | 'very_high';
  let recommendation: string;

  // CA Rule: if DSCR < 0 or EBITDA < 0 → business is not viable → mandatory REJECT
  const isNotViable = ratios.dscr < 0 || (ratios.gross_margin < 0);
  if (isNotViable) {
    risk_level = 'very_high';
    recommendation = 'REJECT';
  } else if (score >= 85) {
    risk_level = 'low';
    recommendation = 'STRONGLY APPROVE';
  } else if (score >= 70) {
    risk_level = 'low';
    recommendation = 'APPROVE';
  } else if (score >= 55) {
    risk_level = 'medium';
    recommendation = 'REVIEW';
  } else {
    risk_level = score >= 40 ? 'high' : 'very_high';
    recommendation = 'REJECT';
  }

  return {
    credit_score: Math.round(score),
    risk_level,
    recommendation,
  };
}

