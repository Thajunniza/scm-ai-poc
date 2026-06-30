'use strict'

jest.mock('../../../srv/helpers/db-helper', () => ({
    getSupplierContext: jest.fn()
}))

jest.mock('../../../srv/helpers/remote-call-helper', () => ({
    callAgent: jest.fn()
}))

jest.mock('@sap/cds', () => ({
    log: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}))

const dbHelper        = require('../../../srv/helpers/db-helper')
const { callAgent }   = require('../../../srv/helpers/remote-call-helper')
const supplierAgent   = require('../../../srv/agents/supplier-risk-agent')

const MOCK_CONTEXT = {
    suppliers: [
        { name: 'TechParts', country: 'Germany', riskScore: 15, status: 'Active',    onTimeDelivery: 97.5, qualityScore: 98.2 },
        { name: 'AsiaComp',  country: 'China',   riskScore: 62, status: 'Probation', onTimeDelivery: 78.4, qualityScore: 82.1 }
    ],
    critical:  [],
    high:      [{ name: 'AsiaComp', country: 'China', riskScore: 62, status: 'Probation', onTimeDelivery: 78.4, qualityScore: 82.1 }],
    medium:    [],
    low:       [{ name: 'TechParts', country: 'Germany', riskScore: 15, status: 'Active', onTimeDelivery: 97.5 }],
    probation: [{ name: 'AsiaComp' }],
    avgRisk:   '38.5'
}

const MOCK_REQ = { user: { id: 'test-user' }, headers: {} }

beforeEach(() => {
    jest.clearAllMocks()
})

describe('supplier-risk-agent.js', () => {

    describe('identity', () => {
        test('has correct name', () => {
            expect(supplierAgent.name).toBe('SupplierRiskAgent')
        })

        test('declares correct entities', () => {
            expect(supplierAgent.entities).toContain('scm.Suppliers')
        })
    })

    describe('fetchContext()', () => {
        test('delegates to db-helper.getSupplierContext()', async () => {
            dbHelper.getSupplierContext.mockResolvedValue(MOCK_CONTEXT)
            const result = await supplierAgent.fetchContext('test')
            expect(dbHelper.getSupplierContext).toHaveBeenCalledTimes(1)
            expect(result).toEqual(MOCK_CONTEXT)
        })
    })

    describe('simulateResponse()', () => {
        test('includes high risk suppliers', () => {
            const result = supplierAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('AsiaComp')
            expect(result).toContain('HIGH')
        })

        test('flags probation suppliers', () => {
            const result = supplierAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('PROBATION')
        })

        test('includes low risk suppliers', () => {
            const result = supplierAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('TechParts')
        })

        test('includes average risk score', () => {
            const result = supplierAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('38.5')
        })
    })

    describe('run() — full orchestration', () => {

        test('returns success response with AI reply', async () => {
            dbHelper.getSupplierContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: 'Risk answer', inputTokens: 80, outputTokens: 30 })

            const result = await supplierAgent.run(MOCK_REQ, 'Who is high risk?')

            expect(result.status).toBe('success')
            expect(result.reply).toBe('Risk answer')
            expect(result.agentUsed).toBe('SupplierRiskAgent')
        })

        test('falls back to simulation when AI unavailable', async () => {
            dbHelper.getSupplierContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: null, simulated: true })

            const result = await supplierAgent.run(MOCK_REQ, 'Who is high risk?')

            expect(result.reply).toContain('Supplier Risk Assessment Report')
        })

        test('throws AICallError when remote call fails', async () => {
            dbHelper.getSupplierContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockRejectedValue(new Error('Connection refused'))
            const { AICallError } = require('../../../srv/utils/errors')

            await expect(supplierAgent.run(MOCK_REQ, 'test'))
                .rejects.toThrow(AICallError)
        })
    })
})