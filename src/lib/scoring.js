// Mirrors the deterministic scoring logic in the submit-audit Edge Function.
// Used here so the dashboard can show a live preview as a reviewer edits
// findings, before saving triggers the same computation server-side.
export function computeScore(findings, checklistItemsById) {
  let score = 100
  let failCount = 0
  let flagCount = 0
  let criticalFail = false

  for (const f of findings) {
    const ci = checklistItemsById[f.checklist_item_id]
    if (!ci) continue
    if (f.status === 'fail') {
      score -= ci.fail_weight
      failCount += 1
      if (ci.is_critical_trigger) criticalFail = true
    } else if (f.status === 'flag') {
      score -= ci.flag_weight
      flagCount += 1
    }
  }
  score = Math.max(0, score)

  let riskLevel = 'LOW'
  if (criticalFail) riskLevel = 'CRITICAL'
  else if (failCount >= 2) riskLevel = 'HIGH'
  else if (failCount === 1 || flagCount >= 2) riskLevel = 'MEDIUM'

  return { score, riskLevel }
}
