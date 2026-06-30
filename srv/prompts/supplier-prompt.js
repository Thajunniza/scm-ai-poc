'use strict'

/**
 * supplier-prompt.js
 * ───────────────────
 * Builds the complete prompt for the Supplier Risk Agent.
 */

const { buildMessages, formatSection, formatSummary } = require('./base-prompt')

const SYSTEM_PROMPT = `
You are the Supplier Risk Assessment Agent for Aptiv's Supply Chain Management system.

YOUR EXPERTISE:
- Evaluating supplier risk profiles using quantitative scores
- Identifying suppliers that pose supply chain risk
- Recommending risk mitigation and diversification strategies
- Monitoring probation suppliers for improvement or escalation
- Benchmarking supplier performance (OTD, quality, risk score)

RISK SCORING SCALE:
- 0-24:  🟢 LOW RISK      — reliable, continue as-is
- 25-49: 🟡 MEDIUM RISK   — monitor quarterly, have backup plan
- 50-74: 🟠 HIGH RISK     — take action, find alternatives
- 75-100: 🔴 CRITICAL RISK — immediate intervention required

YOUR DOMAIN:
- On-Time Delivery (OTD) below 90% is a concern
- Quality score below 90% requires corrective action
- Probation status means supplier is under formal review
- Geographic concentration is a hidden risk factor

WHAT YOU DO NOT KNOW:
- Current shipment status (ask the Delivery Agent)
- Current stock levels (ask the Inventory Agent)
`

const FEW_SHOT_EXAMPLES = [
    {
        user: 'Which suppliers are high risk?',
        assistant: `**Supplier Risk Assessment**

2 suppliers are classified as HIGH RISK and require immediate review.

🟠 **HIGH RISK SUPPLIERS:**

1. **AsiaComp Ltd** (China) — Risk Score: 62/100
   OTD: 78.4% | Quality: 82.1% | Status: PROBATION
   Concern: Below threshold on both OTD and quality, currently on probation

**Recommended Actions:**
1. Schedule formal review with AsiaComp Ltd within 2 weeks
2. Identify alternative electronics suppliers to reduce dependency
3. Reduce order volumes until performance improves`
    },
    {
        user: 'Who are our most reliable suppliers?',
        assistant: `**Top Performing Suppliers**

Our most reliable partners based on risk score and performance:

🟢 **LOW RISK — TRUSTED PARTNERS:**

1. **PrecisionMech GmbH** (Germany) — Risk Score: 12/100 ⭐
   OTD: 98.1% | Quality: 99.0% | Partner since: 2016

**Recommended Actions:**
Consider expanding contract scope with top performers to reduce
dependency on higher-risk suppliers.`
    }
]

function buildContext(context) {
    const { suppliers, critical, high, medium, low, probation, avgRisk } = context

    const criticalSection = formatSection(
        'CRITICAL RISK (75-100) — IMMEDIATE INTERVENTION',
        critical,
        s => `  • ${s.name} (${s.country}) | Score: ${s.riskScore}/100
    OTD: ${s.onTimeDelivery}% | Quality: ${s.qualityScore}% | Status: ${s.status}
    Partner Since: ${s.since}`
    )

    const highSection = formatSection(
        'HIGH RISK (50-74) — ACTION REQUIRED',
        high,
        s => `  • ${s.name} (${s.country}) | Score: ${s.riskScore}/100
    OTD: ${s.onTimeDelivery}% | Quality: ${s.qualityScore}% | Status: ${s.status}`
    )

    const mediumSection = formatSection(
        'MEDIUM RISK (25-49) — MONITOR',
        medium,
        s => `  • ${s.name} (${s.country}) | Score: ${s.riskScore}/100 | OTD: ${s.onTimeDelivery}%`
    )

    const lowSection = formatSection(
        'LOW RISK (0-24) — RELIABLE PARTNERS',
        low,
        s => `  • ${s.name} (${s.country}) | Score: ${s.riskScore}/100 | OTD: ${s.onTimeDelivery}%`
    )

    const summary = formatSummary({
        'Total Suppliers':       suppliers.length,
        'Critical Risk':         critical.length,
        'High Risk':             high.length,
        'Medium Risk':           medium.length,
        'Low Risk':              low.length,
        'On Probation':          probation.length,
        'Portfolio Avg Score':   `${avgRisk}/100`
    })

    return [criticalSection, highSection, mediumSection, lowSection, summary].join('\n')
}

function buildSupplierPrompt(userMessage, context) {
    return buildMessages({
        systemPrompt:    SYSTEM_PROMPT,
        contextData:     buildContext(context),
        fewShotExamples: FEW_SHOT_EXAMPLES,
        userMessage
    })
}

module.exports = { buildSupplierPrompt, buildContext }