'use strict'

const { buildInventoryPrompt, buildContext } = require('../../../srv/prompts/inventory-prompt')

const MOCK_CONTEXT = {
    products: [
        { sku: 'P001', name: 'CPU', stockLevel: 45,  reorderPoint: 50,  maxStock: 500, unitCost: 320, warehouse: 'WH-Berlin'   },
        { sku: 'P002', name: 'RAM', stockLevel: 120, reorderPoint: 100, maxStock: 1000,unitCost: 85,  warehouse: 'WH-Berlin'   },
        { sku: 'P003', name: 'SSD', stockLevel: 0,   reorderPoint: 80,  maxStock: 800, unitCost: 65,  warehouse: 'WH-Shanghai' }
    ],
    critical:   [{ sku: 'P003', name: 'SSD', stockLevel: 0,  reorderPoint: 80,  unitCost: 65,  warehouse: 'WH-Shanghai' }],
    low:        [{ sku: 'P001', name: 'CPU', stockLevel: 45, reorderPoint: 50,  unitCost: 320, warehouse: 'WH-Berlin'   }],
    healthy:    [{ sku: 'P002', name: 'RAM', stockLevel: 120,reorderPoint: 100, maxStock: 1000,unitCost: 85,  warehouse: 'WH-Berlin' }],
    totalValue: 24600
}

describe('inventory-prompt.js', () => {

    describe('buildContext()', () => {

        test('returns a non-empty string', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)
        })

        test('includes out of stock section', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(result).toContain('OUT OF STOCK')
        })

        test('includes low stock section', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(result).toContain('LOW STOCK')
        })

        test('includes product SKUs in context', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(result).toContain('P001')
            expect(result).toContain('P003')
        })

        test('includes total inventory value', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(result).toContain('24600')
        })

        test('handles empty critical list gracefully', () => {
            const ctx = { ...MOCK_CONTEXT, critical: [] }
            const result = buildContext(ctx)
            expect(result).toContain('None found')
        })
    })

    describe('buildInventoryPrompt()', () => {

        test('returns array of messages', () => {
            const messages = buildInventoryPrompt('What is low on stock?', MOCK_CONTEXT)
            expect(Array.isArray(messages)).toBe(true)
            expect(messages.length).toBeGreaterThan(0)
        })

        test('first message is system role', () => {
            const messages = buildInventoryPrompt('test', MOCK_CONTEXT)
            expect(messages[0].role).toBe('system')
        })

        test('last message is user role with question', () => {
            const messages = buildInventoryPrompt('What is low on stock?', MOCK_CONTEXT)
            const last = messages[messages.length - 1]
            expect(last.role).toBe('user')
            expect(last.content).toContain('What is low on stock?')
        })

        test('system prompt contains agent identity', () => {
            const messages = buildInventoryPrompt('test', MOCK_CONTEXT)
            expect(messages[0].content).toContain('Inventory Status Agent')
        })

        test('includes few-shot examples', () => {
            const messages = buildInventoryPrompt('test', MOCK_CONTEXT)
            const roles = messages.map(m => m.role)
            expect(roles).toContain('assistant')
        })

        test('context data is injected into messages', () => {
            const messages = buildInventoryPrompt('test', MOCK_CONTEXT)
            const allContent = messages.map(m => m.content).join(' ')
            expect(allContent).toContain('P003')
        })
    })
})