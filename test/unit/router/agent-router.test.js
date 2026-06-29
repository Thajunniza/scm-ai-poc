'use strict'

const { detectIntent } = require('../../../srv/router/agent-router')
const { INTENTS, CONFIDENCE } = require('../../../srv/utils/constants')

describe('agent-router.js', () => {

    // ── Hint-based routing ────────────────────────────────────────
    describe('detectIntent() - hint based', () => {

        test('resolves inventory intent from hint', () => {
            const result = detectIntent('tell me something', 'inventory')
            expect(result.intent).toBe(INTENTS.INVENTORY)
            expect(result.confidence).toBe(CONFIDENCE.HIGH)
        })

        test('resolves delivery intent from hint', () => {
            const result = detectIntent('tell me something', 'delivery')
            expect(result.intent).toBe(INTENTS.DELIVERY)
            expect(result.confidence).toBe(CONFIDENCE.HIGH)
        })

        test('resolves supplier intent from hint', () => {
            const result = detectIntent('tell me something', 'supplier')
            expect(result.intent).toBe(INTENTS.SUPPLIER_RISK)
            expect(result.confidence).toBe(CONFIDENCE.HIGH)
        })

        test('hint takes priority over message keywords', () => {
            // Message says delivery but hint says inventory
            const result = detectIntent('any delayed shipments?', 'inventory')
            expect(result.intent).toBe(INTENTS.INVENTORY)
        })
    })

    // ── Keyword-based routing ─────────────────────────────────────
    describe('detectIntent() - keyword based', () => {

        test('detects inventory intent from stock keyword', () => {
            const result = detectIntent('what is the stock level?', '')
            expect(result.intent).toBe(INTENTS.INVENTORY)
        })

        test('detects inventory intent from reorder keyword', () => {
            const result = detectIntent('which products need reorder?', '')
            expect(result.intent).toBe(INTENTS.INVENTORY)
        })

        test('detects delivery intent from shipment keyword', () => {
            const result = detectIntent('show me all delayed shipments', '')
            expect(result.intent).toBe(INTENTS.DELIVERY)
        })

        test('detects delivery intent from tracking keyword', () => {
            const result = detectIntent('tracking number DHL-123', '')
            expect(result.intent).toBe(INTENTS.DELIVERY)
        })

        test('detects supplier intent from risk keyword', () => {
            const result = detectIntent('which suppliers are high risk?', '')
            expect(result.intent).toBe(INTENTS.SUPPLIER_RISK)
        })

        test('detects supplier intent from vendor keyword', () => {
            const result = detectIntent('show vendor performance scores', '')
            expect(result.intent).toBe(INTENTS.SUPPLIER_RISK)
        })
    })

    // ── Phrase-based routing (higher score) ───────────────────────
    describe('detectIntent() - phrase based', () => {

        test('detects inventory from multi-word phrase', () => {
            const result = detectIntent('show me items below reorder point', '')
            expect(result.intent).toBe(INTENTS.INVENTORY)
            expect(result.confidence).toBe(CONFIDENCE.HIGH)
        })

        test('detects delivery from multi-word phrase', () => {
            const result = detectIntent('what is the delivery status of my order?', '')
            expect(result.intent).toBe(INTENTS.DELIVERY)
        })

        test('detects supplier from multi-word phrase', () => {
            const result = detectIntent('run a supplier risk assessment', '')
            expect(result.intent).toBe(INTENTS.SUPPLIER_RISK)
        })
    })

    // ── Unknown intent ────────────────────────────────────────────
    describe('detectIntent() - unknown', () => {

        test('returns unknown for unrelated message', () => {
            const result = detectIntent('hello how are you', '')
            expect(result.intent).toBe(INTENTS.UNKNOWN)
            expect(result.confidence).toBeNull()
        })

        test('returns unknown for empty-ish message', () => {
            const result = detectIntent('ok', '')
            expect(result.intent).toBe(INTENTS.UNKNOWN)
        })

        test('scores object is always returned', () => {
            const result = detectIntent('random text here', '')
            expect(result.scores).toBeDefined()
            expect(typeof result.scores).toBe('object')
        })
    })

    // ── Confidence levels ─────────────────────────────────────────
    describe('detectIntent() - confidence', () => {

        test('returns HIGH confidence for phrase match', () => {
            const result = detectIntent('show me all items below reorder point now', '')
            expect(result.confidence).toBe(CONFIDENCE.HIGH)
        })

        test('returns LOW confidence for single keyword match', () => {
            const result = detectIntent('stock', '')
            expect([CONFIDENCE.LOW, CONFIDENCE.MEDIUM])
                .toContain(result.confidence)
        })
    })
})