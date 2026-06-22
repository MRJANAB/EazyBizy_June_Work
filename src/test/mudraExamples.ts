/**
 * Mudra Loan Scheme Examples
 * Demonstrates Mudra scheme validation and eligibility checking
 */

import {
  getMudraSchemeByAmount,
  validateMudraEligibility,
  checkMudraSchemeEligibility,
} from '../lib/loanRulesEngine';

// Example 1: Mudra Shishu (up to ₹50,000)
export function exampleMudraShishu() {
  const loanAmount = 30000;
  const applicant = {
    full_name: 'John Doe',
    date_of_birth: '1990-01-01',
    social_category: 'general' as any,
    repaid_previous_mudra: true,
  };
  const industryType = 'manufacturing' as any;

  const scheme = getMudraSchemeByAmount(loanAmount);
  const validation = validateMudraEligibility(
    scheme!,
    loanAmount,
    applicant,
    industryType
  );

  return {
    loanAmount,
    recommendedScheme: scheme,
    ...validation,
  };
}

// Example 2: Mudra Kishor (₹50,001 to ₹5,00,000)
export function exampleMudraKishor() {
  const loanAmount = 200000;
  const applicant = {
    full_name: 'Jane Smith',
    date_of_birth: '1985-05-15',
    social_category: 'general' as any,
    repaid_previous_mudra: true,
  };
  const industryType = 'service' as any;

  const scheme = getMudraSchemeByAmount(loanAmount);
  const validation = validateMudraEligibility(
    scheme!,
    loanAmount,
    applicant,
    industryType
  );

  return {
    loanAmount,
    recommendedScheme: scheme,
    ...validation,
  };
}

// Example 3: Mudra Tarun (₹5,00,001 to ₹10,00,000)
export function exampleMudraTarun() {
  const loanAmount = 750000;
  const applicant = {
    full_name: 'Raj Kumar',
    date_of_birth: '1980-03-20',
    social_category: 'general' as any,
    repaid_previous_mudra: true,
  };
  const industryType = 'trading' as any;

  const scheme = getMudraSchemeByAmount(loanAmount);
  const validation = validateMudraEligibility(
    scheme!,
    loanAmount,
    applicant,
    industryType
  );

  return {
    loanAmount,
    recommendedScheme: scheme,
    ...validation,
  };
}

// Example 4: Mudra Tarun Plus (₹10,00,001 to ₹20,00,000)
export function exampleMudraTarunPlus() {
  const loanAmount = 1500000;
  const applicant = {
    full_name: 'Priya Singh',
    date_of_birth: '1975-08-10',
    social_category: 'general' as any,
    repaid_previous_mudra: true, // Must be true for Tarun Plus
  };
  const industryType = 'manufacturing' as any;

  const scheme = getMudraSchemeByAmount(loanAmount);
  const validation = validateMudraEligibility(
    scheme!,
    loanAmount,
    applicant,
    industryType
  );

  return {
    loanAmount,
    recommendedScheme: scheme,
    ...validation,
  };
}

// Example 5: Mudra Tarun Plus without prior repayment (should fail)
export function exampleMudraTarunPlusNoRepayment() {
  const loanAmount = 1500000;
  const applicant = {
    full_name: 'Amit Patel',
    date_of_birth: '1975-08-10',
    social_category: 'general' as any,
    repaid_previous_mudra: false, // This will cause failure
  };
  const industryType = 'service' as any;

  const scheme = getMudraSchemeByAmount(loanAmount);
  const validation = validateMudraEligibility(
    scheme!,
    loanAmount,
    applicant,
    industryType
  );

  return {
    loanAmount,
    recommendedScheme: scheme,
    ...validation,
  };
}

// Example 6: Comprehensive scheme eligibility check
export function exampleComprehensiveMudraCheck() {
  const loanAmount = 800000;
  const applicant = {
    full_name: 'Sunita Sharma',
    date_of_birth: '1982-11-25',
    social_category: 'general' as any,
    repaid_previous_mudra: true,
  };
  const industryType = 'manufacturing' as any;
  const financialRatios = {
    debt_equity_ratio: 1.5,
    dscr: 1.8,
    roe: 25,
    current_ratio: 1.8,
    gross_margin: 35,
  };

  const result = checkMudraSchemeEligibility(
    loanAmount,
    applicant,
    industryType,
    financialRatios
  );

  return {
    loanAmount,
    ...result,
  };
}

// Example 7: Invalid loan amount (too high)
export function exampleInvalidLoanAmount() {
  const loanAmount = 2500000; // Above ₹20 lakhs limit
  const applicant = {
    full_name: 'Vikram Singh',
    date_of_birth: '1970-01-01',
    social_category: 'general' as any,
    repaid_previous_mudra: true,
  };
  const industryType = 'manufacturing' as any;

  const result = checkMudraSchemeEligibility(
    loanAmount,
    applicant,
    industryType
  );

  return {
    loanAmount,
    ...result,
  };
}

// Example usage in React component:
/*
import { exampleComprehensiveMudraCheck } from './mudraExamples';

function MudraEligibilityChecker() {
  const mudraResult = exampleComprehensiveMudraCheck();

  return (
    <div className="mudra-checker">
      <h3>Mudra Scheme Eligibility</h3>

      <div className="result-summary">
        <p><strong>Loan Amount:</strong> ₹{mudraResult.loanAmount.toLocaleString()}</p>
        <p><strong>Recommended Scheme:</strong> {mudraResult.recommendedScheme?.toUpperCase()}</p>
        <p><strong>Eligible:</strong> {mudraResult.isEligible ? 'Yes' : 'No'}</p>
      </div>

      {mudraResult.errors.length > 0 && (
        <div className="errors">
          <h4>Issues:</h4>
          <ul>
            {mudraResult.errors.map((error, index) => (
              <li key={index} className="text-red-600">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {mudraResult.warnings.length > 0 && (
        <div className="warnings">
          <h4>Warnings:</h4>
          <ul>
            {mudraResult.warnings.map((warning, index) => (
              <li key={index} className="text-yellow-600">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {mudraResult.recommendations.length > 0 && (
        <div className="recommendations">
          <h4>Recommendations:</h4>
          <ul>
            {mudraResult.recommendations.map((rec, index) => (
              <li key={index} className="text-blue-600">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {mudraResult.alternatives.length > 0 && (
        <div className="alternatives">
          <h4>Alternative Schemes:</h4>
          <ul>
            {mudraResult.alternatives.map((alt, index) => (
              <li key={index}>{alt.toUpperCase()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
*/