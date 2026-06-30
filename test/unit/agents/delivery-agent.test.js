'use strict'

jest.mock('../../../srv/helpers/db-helper', () => ({
    getDeliveryContext: jest.fn()
}))

jest.mock('../../../srv/helpers/remote-call-helper', () => ({
    callAgent: jest.fn()
}))

jest.mock('@sap/cds', () => ({
    log: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}))

const dbHelper      = require('../../../srv/helpers/db-helper')
const { callAgent } = require('../../../srv/helpers/remote-call-helper')
const deliveryAgent = require('../../../srv/agents/delivery-agent')

const MOCK_CONTEXT = {
    shipments: [
        { trackingNumber: 'FDX-002', status: 'Delayed',   carrier: 'FedEx', origin: 'Sao Paulo', destination: 'Munich', estimatedArrival: '2026-05-25', lastLocation: 'Miami', delayReason: 'Customs' },
        { trackingNumber: 'UPS-003', status: 'InTransit', carrier: 'UPS',   origin: 'Shanghai',  destination: 'Amsterdam', estimatedArrival: '2026-07-01', lastLocation: 'Singapore' }
    ],
    delayed:    [{ trackingNumber: 'FDX-002', carrier: 'FedEx', origin: 'Sao Paulo', destination: 'Munich', estimatedArrival: '2026-05-25', lastLocation: 'Miami', delayReason: 'Customs' }],
    inTransit:  [{ trackingNumber: 'UPS-003', carrier: 'UPS', origin: 'Shanghai', destination: 'Amsterdam', estimatedArrival: '2026-07-01', lastLocation: 'Singapore' }],
    delivered:  [],
    pending:    [],
    onTimeRate: 'N/A'
}

const MOCK_REQ = { user: { id: 'test-user' }, headers: {} }

beforeEach(() => {
    jest.clearAllMocks()
})

describe('delivery-agent.js', () => {

    describe('identity', () => {
        test('has correct name', () => {
            expect(deliveryAgent.name).toBe('DeliveryAgent')
        })

        test('declares correct entities', () => {
            expect(deliveryAgent.entities).toContain('scm.Shipments')
        })
    })

    describe('fetchContext()', () => {
        test('delegates to db-helper.getDeliveryContext()', async () => {
            dbHelper.getDeliveryContext.mockResolvedValue(MOCK_CONTEXT)
            const result = await deliveryAgent.fetchContext('test')
            expect(dbHelper.getDeliveryContext).toHaveBeenCalledTimes(1)
            expect(result).toEqual(MOCK_CONTEXT)
        })
    })

    describe('simulateResponse()', () => {
        test('includes delayed shipments', () => {
            const result = deliveryAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('FDX-002')
            expect(result).toContain('Customs')
        })

        test('includes in-transit shipments', () => {
            const result = deliveryAgent.simulateResponse(MOCK_CONTEXT)
            expect(result).toContain('UPS-003')
        })

        test('shows all-clear message when no delays', () => {
            const ctx = { ...MOCK_CONTEXT, delayed: [] }
            const result = deliveryAgent.simulateResponse(ctx)
            expect(result).toContain('No delayed shipments')
        })
    })

    describe('run() — full orchestration', () => {

        test('returns success response with AI reply', async () => {
            dbHelper.getDeliveryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: 'Delivery answer', inputTokens: 90, outputTokens: 40 })

            const result = await deliveryAgent.run(MOCK_REQ, 'Any delays?')

            expect(result.status).toBe('success')
            expect(result.reply).toBe('Delivery answer')
            expect(result.agentUsed).toBe('DeliveryAgent')
        })

        test('falls back to simulation when AI unavailable', async () => {
            dbHelper.getDeliveryContext.mockResolvedValue(MOCK_CONTEXT)
            callAgent.mockResolvedValue({ reply: null, simulated: true })

            const result = await deliveryAgent.run(MOCK_REQ, 'Any delays?')

            expect(result.reply).toContain('Delivery Status Report')
        })

        test('throws DataFetchError when DB fails', async () => {
            dbHelper.getDeliveryContext.mockRejectedValue(new Error('DB down'))
            const { DataFetchError } = require('../../../srv/utils/errors')

            await expect(deliveryAgent.run(MOCK_REQ, 'test'))
                .rejects.toThrow(DataFetchError)
        })
    })
})