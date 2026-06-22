/**
 * PMEGP Loan Scheme Examples
 * Demonstrates PMEGP subsidy calculations and validations
 */

import {
  calculatePMEGPSubsidy,
  calculatePMEGPMarginMoney,
  calculatePMEGPBankFinance,
  validatePMEGPProjectCost,
  validatePMEGPPromoterContribution,
  generatePMEGPLoanBreakdown,
} from '../lib/loanRulesEngine';

// Example 1: Manufacturing PMEGP - General Category, Rural
export function examplePMEGPManufacturingRural() {
  const projectCost = 3000000; // ₹30 lakhs
  const industryType = 'manufacturing';
  const applicantCategory = 'general';
  const areaType = 'rural';

  const breakdown = generatePMEGPLoanBreakdown(
    projectCost,
    industryType as any,
    applicantCategory as any,
    areaType
  );

  return {
    projectCost,
    industryType,
    applicantCategory,
    areaType,
    ...breakdown,
  };
}

// Example 2: Service PMEGP - Special Category, Urban
export function examplePMEGPServiceUrban() {
  const projectCost = 1500000; // ₹15 lakhs
  const industryType = 'service';
  const applicantCategory = 'special';
  const areaType = 'urban';

  const breakdown = generatePMEGPLoanBreakdown(
    projectCost,
    industryType as any,
    applicantCategory as any,
    areaType
  );

  return {
    projectCost,
    industryType,
    applicantCategory,
    areaType,
    ...breakdown,
  };
}

// Example 3: Manufacturing Second Loan
export function examplePMEGPSecondLoan() {
  const projectCost = 7500000; // ₹75 lakhs
  const industryType = 'manufacturing';
  const applicantCategory = 'general';
  const areaType = 'rural';
  const isSecondLoan = true;

  const breakdown = generatePMEGPLoanBreakdown(
    projectCost,
    industryType as any,
    applicantCategory as any,
    areaType,
    isSecondLoan
  );

  return {
    projectCost,
    industryType,
    applicantCategory,
    areaType,
    isSecondLoan,
    ...breakdown,
  };
}

// Example 4: Invalid Project Cost (too high)
export function examplePMEGPInvalidCost() {
  const projectCost = 6000000; // ₹60 lakhs (too high for service)
  const industryType = 'service';
  const applicantCategory = 'general';
  const areaType = 'urban';

  const breakdown = generatePMEGPLoanBreakdown(
    projectCost,
    industryType as any,
    applicantCategory as any,
    areaType
  );

  return {
    projectCost,
    industryType,
    applicantCategory,
    areaType,
    ...breakdown,
  };
}

// Example usage in React component:
/*
import { examplePMEGPManufacturingRural } from './pmegpExamples';

function PMEGPCalculator() {
  const pmegpData = examplePMEGPManufacturingRural();

  return (
    <div className="pmegp-calculator">
      <h3>PMEGP Loan Breakdown</h3>

      <div className="breakdown-grid">
        <div>
          <strong>Project Cost:</strong> ₹{pmegpData.projectCost.toLocaleString()}
        </div>
        <div>
          <strong>Government Subsidy:</strong> ₹{pmegpData.subsidyAmount.toLocaleString()}
        </div>
        <div>
          <strong>Margin Money (Your Contribution):</strong> ₹{pmegpData.marginMoney.toLocaleString()}
        </div>
        <div>
          <strong>Bank Finance:</strong> ₹{pmegpData.bankFinance.toLocaleString()}
        </div>
      </div>

      {!pmegpData.isEligible && (
        <div className="errors">
          <h4>Validation Issues:</h4>
          <ul>
            {pmegpData.validationErrors.map((error, index) => (
              <li key={index} className="text-red-600">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {pmegpData.validationWarnings.length > 0 && (
        <div className="warnings">
          <h4>Warnings:</h4>
          <ul>
            {pmegpData.validationWarnings.map((warning, index) => (
              <li key={index} className="text-yellow-600">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
*/