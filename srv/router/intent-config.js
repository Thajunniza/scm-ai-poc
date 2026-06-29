'use strict'

/**
 * intent-config.js
 * ─────────────────
 * Single source of truth for all intent detection rules.
 * To add a new agent — just add a new entry here.
 * No changes needed anywhere else in the routing logic.
 */

const { INTENTS } = require('../utils/constants')

/**
 * Each intent has:
 *   keywords  — words that strongly suggest this intent
 *   phrases   — multi-word phrases (weighted higher than single keywords)
 *   hints     — exact agentHint values that map to this intent
 *   threshold — minimum score needed to confirm this intent
 */
const INTENT_CONFIG = {

    [INTENTS.INVENTORY]: {
        hints: ['inventory', 'stock', 'warehouse'],
        phrases: [
            'low stock',
            'out of stock',
            'reorder point',
            'stock level',
            'inventory status',
            'available quantity',
            'stock alert'
        ],
        keywords: [
            'stock',
            'inventory',
            'reorder',
            'warehouse',
            'sku',
            'product',
            'quantity',
            'units',
            'stockout',
            'replenish',
            'availability',
            'items'
        ],
        threshold: 1
    },

    [INTENTS.DELIVERY]: {
        hints: ['delivery', 'shipment', 'shipping', 'tracking'],
        phrases: [
            'in transit',
            'delivery status',
            'tracking number',
            'expected delivery',
            'shipment delay',
            'customs clearance',
            'port congestion'
        ],
        keywords: [
            'shipment',
            'delivery',
            'tracking',
            'carrier',
            'transit',
            'ship',
            'delay',
            'delayed',
            'arrived',
            'cargo',
            'freight',
            'customs',
            'dhl',
            'fedex',
            'ups',
            'route',
            'port'
        ],
        threshold: 1
    },

    [INTENTS.SUPPLIER_RISK]: {
        hints: ['supplier', 'vendor', 'risk'],
        phrases: [
            'supplier risk',
            'vendor performance',
            'on time delivery',
            'quality score',
            'risk assessment',
            'supplier status',
            'high risk supplier'
        ],
        keywords: [
            'supplier',
            'vendor',
            'risk',
            'reliable',
            'performance',
            'quality',
            'probation',
            'partner',
            'sourcing',
            'procurement',
            'assess',
            'score',
            'rating'
        ],
        threshold: 1
    }
}

module.exports = { INTENT_CONFIG }