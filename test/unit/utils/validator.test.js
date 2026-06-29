'use strict'

const {
    validateMessage,
    validateAgentHint,
    validateChatRequest
} = require('../../../srv/utils/validator')

const { ValidationError } = require('../../../srv/utils/errors')

describe('validator.js', () => {

    // ── validateMessage ───────────────────────────────────────────
    describe('validateMessage()', () => {

        test('returns sanitized message for valid input', () => {
            expect(validateMessage('What is the stock level?'))
                .toBe('What is the stock level?')
        })

        test('trims whitespace from valid message', () => {
            expect(validateMessage('  hello world  '))
                .toBe('hello world')
        })

        test('throws ValidationError when message is null', () => {
            expect(() => validateMessage(null))
                .toThrow(ValidationError)
        })

        test('throws ValidationError when message is undefined', () => {
            expect(() => validateMessage(undefined))
                .toThrow(ValidationError)
        })

        test('throws ValidationError when message is too short', () => {
            expect(() => validateMessage('a'))
                .toThrow(ValidationError)
        })

        test('throws ValidationError when message is too long', () => {
            expect(() => validateMessage('a'.repeat(1001)))
                .toThrow(ValidationError)
        })

        test('throws ValidationError when message is not a string', () => {
            expect(() => validateMessage(123))
                .toThrow(ValidationError)
        })

        test('throws ValidationError for empty string', () => {
            expect(() => validateMessage(''))
                .toThrow(ValidationError)
        })

        test('accepts message at max length boundary', () => {
            const msg = 'a'.repeat(1000)
            expect(validateMessage(msg)).toBe(msg)
        })
    })

    // ── validateAgentHint ─────────────────────────────────────────
    describe('validateAgentHint()', () => {

        test('returns empty string when hint is not provided', () => {
            expect(validateAgentHint(null)).toBe('')
            expect(validateAgentHint(undefined)).toBe('')
            expect(validateAgentHint('')).toBe('')
        })

        test('accepts valid hint: inventory', () => {
            expect(validateAgentHint('inventory')).toBe('inventory')
        })

        test('accepts valid hint: delivery', () => {
            expect(validateAgentHint('delivery')).toBe('delivery')
        })

        test('accepts valid hint: supplier', () => {
            expect(validateAgentHint('supplier')).toBe('supplier')
        })

        test('normalizes hint to lowercase', () => {
            expect(validateAgentHint('INVENTORY')).toBe('inventory')
        })

        test('throws ValidationError for invalid hint', () => {
            expect(() => validateAgentHint('unknown-agent'))
                .toThrow(ValidationError)
        })
    })

    // ── validateChatRequest ───────────────────────────────────────
    describe('validateChatRequest()', () => {

        test('returns sanitized message and hint for valid input', () => {
            const result = validateChatRequest({
                message:   'What products are low on stock?',
                agentHint: 'inventory'
            })
            expect(result.message).toBe('What products are low on stock?')
            expect(result.agentHint).toBe('inventory')
        })

        test('throws when message is missing from request', () => {
            expect(() => validateChatRequest({ agentHint: 'inventory' }))
                .toThrow(ValidationError)
        })

        test('handles missing agentHint gracefully', () => {
            const result = validateChatRequest({
                message: 'Any delayed shipments?'
            })
            expect(result.agentHint).toBe('')
        })

        test('throws when data object is null', () => {
            expect(() => validateChatRequest(null))
                .toThrow(ValidationError)
        })
    })
})