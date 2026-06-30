/**
 * agentMeta.js
 * ─────────────
 * Visual identity per agent — icon, color, label.
 * Keeps agent branding consistent across badges, suggestions, etc.
 */

export const AGENT_META = {
  InventoryAgent: {
    label: 'Inventory Agent',
    short: 'Inventory',
    color: '#4FD1C5',
    glyph: '◧'
  },
  DeliveryAgent: {
    label: 'Delivery Agent',
    short: 'Delivery',
    color: '#F2A65A',
    glyph: '◫'
  },
  SupplierRiskAgent: {
    label: 'Supplier Risk Agent',
    short: 'Supplier Risk',
    color: '#E0654F',
    glyph: '◩'
  },
  RouterAgent: {
    label: 'Copilot Router',
    short: 'Router',
    color: '#AEC0CC',
    glyph: '◇'
  }
}

export function getAgentMeta(agentName) {
  return AGENT_META[agentName] || {
    label: agentName || 'Agent',
    short: agentName || 'Agent',
    color: '#AEC0CC',
    glyph: '○'
  }
}

export const SUGGESTED_PROMPTS = [
  { text: 'What products are critically low on stock?', agent: 'InventoryAgent' },
  { text: 'Are there any delayed shipments?', agent: 'DeliveryAgent' },
  { text: 'Which suppliers are high risk?', agent: 'SupplierRiskAgent' },
  { text: 'What is the total inventory value?', agent: 'InventoryAgent' }
]