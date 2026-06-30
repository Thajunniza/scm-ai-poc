'use strict'

// ── Mock db-helper BEFORE requiring the agent ─────────────────────────────────
jest.mock('../../../srv/helpers/db-helper', () => ({
    getInventoryContext: jest.fn()
}))

// ── Mock remote-call-helper BEFORE requiring the agent ────────────────────────
jest.mock('../../../srv/helpers/remote-call-helper', () => ({
    callAgent: jest.fn()
}))

jest.mock('@sap/cds', () => ({
    log: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}))

const dbHelper      = require('../../../srv/helpers/db-helper')
const { callAgent } = require('../../../srv/helpers/remote-call-helper')
const inventoryAgent = require('../../../srv/agents/inventory-agent')

const MOCK_CONTEXT = {
    products:   [
        { sku: 'P001', name: 'CPU', stockLevel: 45,  reorderPoint: 50,  maxStock: 500, unitCost: 320, warehouse: 'WH-Berlin'   },
        { sku: 'P003', name: 'SSD', stockLevel: 0,   reorderPoint: 80,  maxStock: 800, unitCost: 65,  warehouse: 'WH-Shanghai' }
    ],
    critical:   [{ sku: 'P003', name: 'SSD', stockLevel: 0,  reorderPoint: 80, unitCost: 65,  warehouse: 'WH-Shanghai' }],
    low:        [{ sku: 'P001', name: 'CPU', stockLevel: 45, reorderPoint: 50, unitCost: 320, warehouse: 'WH-Berlin'   }],
    healthy:    [],
    totalValue: 14400
}

const MOCK_REQ = { user: { id: 'test-user', email: 'test@aptiv.com' }, headers: {} }

beforeEach(() => {
    jest.clearAllMocks()
})

describe('inventory-agent.js', () => {

    describe('identity', () => {
        test('has correct name', () => {
            expect(inventoryAgent.name).toBe('InventoryAgent')
        })

        test('declares correct entities', () => {
            expect(inventoryAgent.entities).toContain('scm.Products')
        })
    })

    describe('fetchContext()', () => {
        test('delegates to db-helper.getInventoryContext()', async () => {
            dbHelper.getInventoryContext.mockResolvedValue(MOCK_CONTEXT)

            const result = await inventoryAgent.fetchContext('test message')

            expect(dbHelper.getInventoryContext).toHaveBeenCalledTimes(1)
            expect(result).toEqual(MOCK_CONTEXT)
        })
    })

    describe('buildPrompt()', () => {
        test('returns a messages array', () => {
            const messages = inventoryAgent.buildPrompt('What is low?', MOCK_CONTEXT)
            expect(Array.isArray(messages)).toBe(true)
            expect(messages.length).toBeGreaterThan(0)
        })
    })

    describe('parseResponse()', () => {
        test('returns aiResult.reply when present', () => {
            const result = inventoryAgent.parseResponse({ reply: 'AI generated answer' }, MOCK_CONTEXT)
            expect(result).toBe('AI generated answer')
        })

        test('falls back to simulateResponse when reply is null', () => {
            const result = inventoryAgent.parseResponse({ reply: null, simulated: true }, MOCK_CONTEXT)
            expect(result).toContain('Inventory Status Report')
            expect(result).toContain('P003')
        })
    })

    describe('simulateResponse()', () => {
        test('includes out of stock items', () => {
            const result = inventoryAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('OUT OF STOCK')
            expect(result).toContain('SSD')
        })

        test('includes low stock items', () => {
            const result = inventoryAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('LOW STOCK')
            expect(result).toContain('CPU')
        })

        test('shows healthy message when nothing critical', () => {
            const healthyCtx = { products: [], critical: [], low: [], healthy: [], totalValue: 0 }
            const result = inventoryAgent.simulateResponse(healthyCtx)
            expect(result).toContain('No immediate action required')
        })

        test('includes total inventory value', () => {
            const result = inventoryAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('14400.00')
        })
    })

    describe('run() — full orchestration', () => {

        test('calls fetchContext, buildPrompt, callAgent, parseResponse in order', async () => {
            dbHelper.getInventoryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: 'Final AI answer', inputTokens: 100, outputTokens: 50, model: 'gpt-4o' })

            const result = await inventoryAgent.run(MOCK_REQ, 'What is low on stock?')

            expect(dbHelper.getInventoryContext).toHaveBeenCalled()
            expect(callAgent).toHaveBeenCalled()
            expect(result.status).toBe('success')
            expect(result.reply).toBe('Final AI answer')
            expect(result.agentUsed).toBe('InventoryAgent')
        })

        test('returns simulated response when AI stack unavailable', async () => {
            dbHelper.getInventoryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: null, simulated: true, inputTokens: 0, outputTokens: 0 })

            const result = await inventoryAgent.run(MOCK_REQ, 'What is low on stock?')

            expect(result.status).toBe('success')
            expect(result.reply).toContain('Inventory Status Report')
            expect(result.meta.simulated).toBe(true)
        })

        test('includes token usage in meta', async () => {
            dbHelper.getInventoryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: 'answer', inputTokens: 200, outputTokens: 80, model: 'gpt-4o' })

            const result = await inventoryAgent.run(MOCK_REQ, 'test')

            expect(result.meta.inputTokens).toBe(200)
            expect(result.meta.outputTokens).toBe(80)
        })

        test('throws DataFetchError when db-helper fails', async () => {
            dbHelper.getInventoryContext.mockRejectedValue(new Error('DB timeout'))

            const { DataFetchError } = require('../../../srv/utils/errors')

            await expect(inventoryAgent.run(MOCK_REQ, 'test'))
                .rejects.toThrow(DataFetchError)
        })

        test('throws AICallError when remote call fails', async () => {
            dbHelper.getInventoryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockRejectedValue(new Error('AI stack crashed'))

            const { AICallError } = require('../../../srv/utils/errors')

            await expect(inventoryAgent.run(MOCK_REQ, 'test'))
                .rejects.toThrow(AICallError)
        })

        test('uses anonymous when req.user is missing', async () => {
            dbHelper.getInventoryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: 'answer', inputTokens: 1, outputTokens: 1 })

            const result = await inventoryAgent.run({}, 'test')

            expect(result.status).toBe('success')
        })
    })
})