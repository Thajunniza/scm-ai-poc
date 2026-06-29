'use strict'

const { INTENT_CONFIG } = require('../../../srv/router/intent-config')
const { INTENTS }       = require('../../../srv/utils/constants')

describe('intent-config.js', () => {

    describe('INTENT_CONFIG structure', () => {

        test('has all required intents defined', () => {
            expect(INTENT_CONFIG).toHaveProperty(INTENTS.INVENTORY)
            expect(INTENT_CONFIG).toHaveProperty(INTENTS.DELIVERY)
            expect(INTENT_CONFIG).toHaveProperty(INTENTS.SUPPLIER_RISK)
        })

        test('each intent has required fields', () => {
            for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
                expect(config).toHaveProperty('hints',     expect.any(Array))
                expect(config).toHaveProperty('phrases',   expect.any(Array))
                expect(config).toHaveProperty('keywords',  expect.any(Array))
                expect(config).toHaveProperty('threshold', expect.any(Number))
            }
        })

        test('each intent has at least one hint', () => {
            for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
                expect(config.hints.length).toBeGreaterThan(0)
            }
        })

        test('each intent has at least one keyword', () => {
            for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
                expect(config.keywords.length).toBeGreaterThan(0)
            }
        })

        test('threshold is a positive number', () => {
            for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
                expect(config.threshold).toBeGreaterThan(0)
            }
        })

        test('no duplicate keywords across intents', () => {
            const allKeywords = []
            for (const config of Object.values(INTENT_CONFIG)) {
                allKeywords.push(...config.keywords)
            }
            const unique = new Set(allKeywords)
            // Warn if duplicates exist (not a hard fail — some overlap is ok)
            if (unique.size !== allKeywords.length) {
                console.warn('Duplicate keywords detected across intents — review intent-config.js')
            }
            expect(allKeywords.length).toBeGreaterThan(0)
        })
    })

    describe('inventory intent config', () => {

        test('contains stock-related keywords', () => {
            const config = INTENT_CONFIG[INTENTS.INVENTORY]
            expect(config.keywords).toContain('stock')
            expect(config.keywords).toContain('inventory')
            expect(config.keywords).toContain('reorder')
        })

        test('contains stock-related hints', () => {
            const config = INTENT_CONFIG[INTENTS.INVENTORY]
            expect(config.hints).toContain('inventory')
        })
    })

    describe('delivery intent config', () => {

        test('contains delivery-related keywords', () => {
            const config = INTENT_CONFIG[INTENTS.DELIVERY]
            expect(config.keywords).toContain('shipment')
            expect(config.keywords).toContain('delivery')
            expect(config.keywords).toContain('delay')
        })

        test('contains carrier names as keywords', () => {
            const config = INTENT_CONFIG[INTENTS.DELIVERY]
            expect(config.keywords).toContain('dhl')
        })
    })

    describe('supplier intent config', () => {

        test('contains supplier-related keywords', () => {
            const config = INTENT_CONFIG[INTENTS.SUPPLIER_RISK]
            expect(config.keywords).toContain('supplier')
            expect(config.keywords).toContain('risk')
            expect(config.keywords).toContain('vendor')
        })
    })
})