'use strict'

const {
    successResponse,
    clarificationResponse,
    errorResponse
} = require('../../../srv/utils/formatter')

const { AGENTS, CONFIDENCE } = require('../../../srv/utils/constants')
const { ValidationError, DataFetchError } = require('../../../srv/utils/errors')

describe('formatter.js', () => {

    // ── successResponse ───────────────────────────────────────────
    describe('successResponse()', () => {

        test('returns correct structure', () => {
            const result = successResponse({
                reply:      'Here is your inventory status',
                agentUsed:  AGENTS.INVENTORY,
                confidence: CONFIDENCE.HIGH
            })
            expect(result.status).toBe('success')
            expect(result.reply).toBe('Here is your inventory status')
            expect(result.agentUsed).toBe(AGENTS.INVENTORY)
            expect(result.confidence).toBe(CONFIDENCE.HIGH)
            expect(result.timestamp).toBeDefined()
        })

        test('includes empty sources array by default', () => {
            const result = successResponse({ reply: 'test' })
            expect(result.sources).toEqual([])
        })

        test('includes provided sources', () => {
            const result = successResponse({
                reply:   'test',
                sources: ['scm.Products', 'scm.Suppliers']
            })
            expect(result.sources).toHaveLength(2)
        })

        test('includes meta when provided', () => {
            const result = successResponse({
                reply: 'test',
                meta:  { totalItems: 10 }
            })
            expect(result.meta.totalItems).toBe(10)
        })

        test('timestamp is a valid ISO string', () => {
            const result = successResponse({ reply: 'test' })
            expect(() => new Date(result.timestamp)).not.toThrow()
        })
    })

    // ── clarificationResponse ─────────────────────────────────────
    describe('clarificationResponse()', () => {

        test('returns success status', () => {
            const result = clarificationResponse()
            expect(result.status).toBe('success')
        })

        test('reply contains help text', () => {
            const result = clarificationResponse()
            expect(result.reply).toContain('Inventory')
            expect(result.reply).toContain('Deliveries')
            expect(result.reply).toContain('Suppliers')
        })

        test('agentUsed is RouterAgent', () => {
            const result = clarificationResponse()
            expect(result.agentUsed).toBe(AGENTS.ROUTER)
        })
    })

    // ── errorResponse ─────────────────────────────────────────────
    describe('errorResponse()', () => {

        test('returns error status', () => {
            const result = errorResponse(new ValidationError('bad input'))
            expect(result.status).toBe('error')
        })

        test('returns user friendly message for ValidationError', () => {
            const result = errorResponse(new ValidationError('Message is required'))
            expect(result.reply).toBe('Message is required')
        })

        test('returns user friendly message for DataFetchError', () => {
            const result = errorResponse(new DataFetchError('DB timeout'))
            expect(result.reply).toContain('could not retrieve')
        })

        test('never exposes internal error details in reply', () => {
            const result = errorResponse(new DataFetchError('SELECT * FROM secrets'))
            expect(result.reply).not.toContain('SELECT')
            expect(result.reply).not.toContain('secrets')
        })

        test('includes error code in meta', () => {
            const result = errorResponse(new DataFetchError('DB error'))
            expect(result.meta.errorCode).toBe('DATA_FETCH_ERROR')
        })

        test('handles unknown error gracefully', () => {
            const result = errorResponse(new Error('Something random'))
            expect(result.status).toBe('error')
            expect(result.reply).toBeTruthy()
        })
    })
})