// Display label for risk levels -- DB/scoring keeps 'MEDIUM' for backward
// compatibility with existing rows and the submit-audit function, but
// Brandon's severity table uses "Moderate" -- map it at display time only.
const RISK_LABELS = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Moderate', LOW: 'Low' }

export function riskLabel(riskLevel) {
  return RISK_LABELS[riskLevel] ?? riskLevel ?? '-'
}
