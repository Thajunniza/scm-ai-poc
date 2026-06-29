'use strict'

/**
 * constants.js
 * Central place for all magic strings, enums, and config values.
 * Never hardcode these anywhere else in the codebase.
 */

// ── Agent identifiers ─────────────────────────────────────────────────────────
const AGENTS = {
    INVENTORY:     'InventoryAgent',
    DELIVERY:      'DeliveryAgent',
    SUPPLIER_RISK: 'SupplierRiskAgent',
    ROUTER:        'RouterAgent'
}

// ── Intent names — must match keys in intent-config.js ───────────────────────
const INTENTS = {
    INVENTORY:     'inventory',
    DELIVERY:      'delivery',
    SUPPLIER_RISK: 'supplier',
    UNKNOWN:       'unknown'
}

// ── Response confidence levels ────────────────────────────────────────────────
const CONFIDENCE = {
    HIGH:   'HIGH',    // 3+ keyword matches or explicit hint
    MEDIUM: 'MEDIUM',  // 1-2 keyword matches
    LOW:    'LOW'      // fallback / guessed
}

// ── Alert / risk levels ───────────────────────────────────────────────────────
const RISK_LEVELS = {
    LOW:      { label: 'Low Risk',      min: 0,  max: 24, color: 'green' },
    MEDIUM:   { label: 'Medium Risk',   min: 25, max: 49, color: 'yellow' },
    HIGH:     { label: 'High Risk',     min: 50, max: 74, color: 'orange' },
    CRITICAL: { label: 'Critical Risk', min: 75, max: 100,color: 'red' }
}

// ── Shipment statuses ─────────────────────────────────────────────────────────
const SHIPMENT_STATUS = {
    DELIVERED:  'Delivered',
    IN_TRANSIT: 'InTransit',
    DELAYED:    'Delayed',
    PENDING:    'Pending'
}

// ── Supplier statuses ─────────────────────────────────────────────────────────
const SUPPLIER_STATUS = {
    ACTIVE:    'Active',
    PROBATION: 'Probation',
    BLOCKED:   'Blocked'
}

// ── Validation limits ─────────────────────────────────────────────────────────
const VALIDATION = {
    MESSAGE_MIN_LENGTH: 2,
    MESSAGE_MAX_LENGTH: 1000,
    AGENT_HINT_ALLOWED: ['inventory', 'delivery', 'supplier', '']
}

// ── DB entity names ───────────────────────────────────────────────────────────
const ENTITIES = {
    SUPPLIERS:       'scm.Suppliers',
    PRODUCTS:        'scm.Products',
    PURCHASE_ORDERS: 'scm.PurchaseOrders',
    SHIPMENTS:       'scm.Shipments'
}

module.exports = {
    AGENTS,
    INTENTS,
    CONFIDENCE,
    RISK_LEVELS,
    SHIPMENT_STATUS,
    SUPPLIER_STATUS,
    VALIDATION,
    ENTITIES
}