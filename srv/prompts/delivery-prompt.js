'use strict'

/**
 * delivery-prompt.js
 * ───────────────────
 * Builds the complete prompt for the Delivery Tracking Agent.
 */

const { buildMessages, formatSection, formatSummary } = require('./base-prompt')

const SYSTEM_PROMPT = `
You are the Delivery Tracking Agent for Aptiv's Supply Chain Management system.

YOUR EXPERTISE:
- Real-time shipment tracking across all carriers
- Identifying and escalating delayed shipments
- Estimating impact of delays on production schedules
- Recommending mitigation actions for at-risk deliveries
- Carrier performance monitoring (DHL, FedEx, UPS, MSC)

YOUR DOMAIN:
- You track shipments from origin to destination
- You understand delay reasons and their typical resolution times
- Customs delays typically add 3-7 business days
- Port congestion typically adds 2-10 days depending on port
- You prioritize by: delayed first, then in-transit, then delivered

WHAT YOU DO NOT KNOW:
- Stock levels at destination (ask the Inventory Agent)
- Supplier reliability scores (ask the Supplier Risk Agent)
`

const FEW_SHOT_EXAMPLES = [
    {
        user: 'Are there any delayed shipments?',
        assistant: `**Delivery Status Alert**

2 shipments are currently delayed and require attention.

🔴 **DELAYED SHIPMENTS:**

1. **FDX-2026-55219** (FedEx)
   Route: Sao Paulo, Brazil → Munich, Germany
   Expected: 25 May 2026 | Last Location: Miami Customs, USA
   Reason: Documentation issue in customs clearance
   Estimated Additional Delay: 3-5 business days

**Recommended Actions:**
1. Contact FedEx customs broker for FDX-2026-55219
2. Resubmit corrected documentation immediately
3. Assess inventory buffer at destination warehouse`
    },
    {
        user: 'What shipments are currently in transit?',
        assistant: `**Active Shipments — In Transit**

3 shipments are currently en route and on schedule.

🟡 **IN TRANSIT:**

1. **DHL-2026-91002** (DHL) — Chicago → Berlin
   ETA: 10 Jun 2026 | Last Location: Frankfurt, Germany
   Status: On schedule ✅

**Recommended Actions:**
No immediate action required. Next status check in 48 hours.`
    }
]

function buildContext(context) {
    const { shipments, delayed, inTransit, delivered, pending, onTimeRate } = context

    const delayedSection = formatSection(
        'DELAYED — REQUIRES IMMEDIATE ACTION',
        delayed,
        s => `  • ${s.trackingNumber} (${s.carrier})
    Route: ${s.origin} → ${s.destination}
    Expected: ${s.estimatedArrival} | Last Location: ${s.lastLocation}
    Delay Reason: ${s.delayReason || 'Unknown'}`
    )

    const transitSection = formatSection(
        'IN TRANSIT — MONITOR',
        inTransit,
        s => `  • ${s.trackingNumber} (${s.carrier})
    Route: ${s.origin} → ${s.destination}
    ETA: ${s.estimatedArrival} | Last Location: ${s.lastLocation}`
    )

    const deliveredSection = formatSection(
        'DELIVERED',
        delivered,
        s => `  • ${s.trackingNumber} | Arrived: ${s.actualArrival}`
    )

    const summary = formatSummary({
        'Total Shipments':      shipments.length,
        'Delayed':              delayed.length,
        'In Transit':           inTransit.length,
        'Delivered':            delivered.length,
        'Pending':              pending.length,
        'On-Time Delivery Rate': `${onTimeRate}%`
    })

    return [delayedSection, transitSection, deliveredSection, summary].join('\n')
}

function buildDeliveryPrompt(userMessage, context) {
    return buildMessages({
        systemPrompt:    SYSTEM_PROMPT,
        contextData:     buildContext(context),
        fewShotExamples: FEW_SHOT_EXAMPLES,
        userMessage
    })
}

module.exports = { buildDeliveryPrompt, buildContext }