'use strict'

const { buildDeliveryPrompt, buildContext } = require('../../../srv/prompts/delivery-prompt')

const MOCK_CONTEXT = {
    shipments:  [
        { trackingNumber: 'DHL-001', status: 'Delivered', carrier: 'DHL', origin: 'Berlin', destination: 'Chicago', actualArrival: '2026-05-14', estimatedArrival: '2026-05-14' },
        { trackingNumber: 'FDX-002', status: 'Delayed',   carrier: 'FedEx', origin: 'Sao Paulo', destination: 'Munich', estimatedArrival: '2026-05-25', lastLocation: 'Miami', delayReason: 'Customs' },
        { trackingNumber: 'UPS-003', status: 'InTransit', carrier: 'UPS',   origin: 'Shanghai',  destination: 'Amsterdam', estimatedArrival: '2026-07-01', lastLocation: 'Singapore' }
    ],
    delayed:    [{ trackingNumber: 'FDX-002', carrier: 'FedEx', origin: 'Sao Paulo', destination: 'Munich', estimatedArrival: '2026-05-25', lastLocation: 'Miami', delayReason: 'Customs' }],
    inTransit:  [{ trackingNumber: 'UPS-003', carrier: 'UPS', origin: 'Shanghai', destination: 'Amsterdam', estimatedArrival: '2026-07-01', lastLocation: 'Singapore' }],
    delivered:  [{ trackingNumber: 'DHL-001', actualArrival: '2026-05-14' }],
    pending:    [],
    onTimeRate: '100.0'
}

describe('delivery-prompt.js', () => {

    describe('buildContext()', () => {

        test('includes delayed section', () => {
            expect(buildContext(MOCK_CONTEXT)).toContain('DELAYED')
        })

        test('includes tracking numbers', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(result).toContain('FDX-002')
            expect(result).toContain('UPS-003')
        })

        test('includes on-time rate in summary', () => {
            expect(buildContext(MOCK_CONTEXT)).toContain('100.0')
        })

        test('handles no delayed shipments gracefully', () => {
            const ctx = { ...MOCK_CONTEXT, delayed: [] }
            expect(buildContext(ctx)).toContain('None found')
        })
    })

    describe('buildDeliveryPrompt()', () => {

        test('returns array of messages', () => {
            const messages = buildDeliveryPrompt('Any delays?', MOCK_CONTEXT)
            expect(Array.isArray(messages)).toBe(true)
        })

        test('system prompt contains agent identity', () => {
            const messages = buildDeliveryPrompt('test', MOCK_CONTEXT)
            expect(messages[0].content).toContain('Delivery Tracking Agent')
        })

        test('last message contains user question', () => {
            const messages = buildDeliveryPrompt('Any delays?', MOCK_CONTEXT)
            expect(messages[messages.length - 1].content).toContain('Any delays?')
        })
    })
})