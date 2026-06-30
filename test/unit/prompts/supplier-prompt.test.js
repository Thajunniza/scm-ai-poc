'use strict'

const { buildSupplierPrompt, buildContext } = require('../../../srv/prompts/supplier-prompt')

const MOCK_CONTEXT = {
    suppliers: [
        { name: 'TechParts',  country: 'Germany', riskScore: 15, status: 'Active',    onTimeDelivery: 97.5, qualityScore: 98.2, since: '2018-01-15' },
        { name: 'AsiaComp',   country: 'China',   riskScore: 62, status: 'Probation', onTimeDelivery: 78.4, qualityScore: 82.1, since: '2021-02-20' },
        { name: 'GlobalChem', country: 'India',   riskScore: 55, status: 'Probation', onTimeDelivery: 81.7, qualityScore: 84.9, since: '2021-09-12' }
    ],
    critical:  [],
    high:      [
        { name: 'AsiaComp',   country: 'China', riskScore: 62, status: 'Probation', onTimeDelivery: 78.4, qualityScore: 82.1 },
        { name: 'GlobalChem', country: 'India', riskScore: 55, status: 'Probation', onTimeDelivery: 81.7, qualityScore: 84.9 }
    ],
    medium:    [],
    low:       [{ name: 'TechParts', country: 'Germany', riskScore: 15, status: 'Active', onTimeDelivery: 97.5 }],
    probation: [
        { name: 'AsiaComp' },
        { name: 'GlobalChem' }
    ],
    avgRisk:   '44.0'
}

describe('supplier-prompt.js', () => {

    describe('buildContext()', () => {

        test('includes high risk section', () => {
            expect(buildContext(MOCK_CONTEXT)).toContain('HIGH RISK')
        })

        test('includes supplier names', () => {
            const result = buildContext(MOCK_CONTEXT)
            expect(result).toContain('AsiaComp')
            expect(result).toContain('TechParts')
        })

        test('includes average risk score', () => {
            expect(buildContext(MOCK_CONTEXT)).toContain('44.0')
        })

        test('handles no critical suppliers gracefully', () => {
            expect(buildContext(MOCK_CONTEXT)).toContain('None found')
        })
    })

    describe('buildSupplierPrompt()', () => {

        test('returns array of messages', () => {
            const messages = buildSupplierPrompt('Who is high risk?', MOCK_CONTEXT)
            expect(Array.isArray(messages)).toBe(true)
        })

        test('system prompt contains agent identity', () => {
            const messages = buildSupplierPrompt('test', MOCK_CONTEXT)
            expect(messages[0].content).toContain('Supplier Risk Assessment Agent')
        })

        test('system prompt contains risk scale', () => {
            const messages = buildSupplierPrompt('test', MOCK_CONTEXT)
            expect(messages[0].content).toContain('RISK SCORING SCALE')
        })

        test('last message contains user question', () => {
            const messages = buildSupplierPrompt('Who is high risk?', MOCK_CONTEXT)
            expect(messages[messages.length - 1].content).toContain('Who is high risk?')
        })
    })
})