'use strict'

jest.mock('@sap/cds', () => ({
    log: () => ({
        info:  jest.fn(),
        warn:  jest.fn(),
        error: jest.fn()
    })
}))

const { createLogger } = require('../../../srv/utils/logger')

describe('logger.js', () => {

    let logger

    beforeEach(() => {
        logger = createLogger('TestLogger')
    })

    describe('createLogger()', () => {

        test('returns logger object with required methods', () => {
            expect(typeof logger.info).toBe('function')
            expect(typeof logger.warn).toBe('function')
            expect(typeof logger.error).toBe('function')
            expect(typeof logger.requestStart).toBe('function')
            expect(typeof logger.requestEnd).toBe('function')
        })

        test('info() does not throw', () => {
            expect(() => logger.info('test message')).not.toThrow()
        })

        test('info() with context does not throw', () => {
            expect(() => logger.info('test', { userId: 'abc', action: 'chat' })).not.toThrow()
        })

        test('warn() does not throw', () => {
            expect(() => logger.warn('warning message')).not.toThrow()
        })

        test('error() does not throw with Error object', () => {
            expect(() => logger.error('error occurred', new Error('test error'))).not.toThrow()
        })

        test('error() does not throw with custom error', () => {
            const err = { code: 'DATA_FETCH_ERROR', message: 'DB failed' }
            expect(() => logger.error('db error', err)).not.toThrow()
        })

        test('requestStart() does not throw', () => {
            expect(() => logger.requestStart('user123', 'What is low stock?')).not.toThrow()
        })

        test('requestEnd() does not throw', () => {
            expect(() => logger.requestEnd('user123', 1200)).not.toThrow()
        })

        test('handles empty context gracefully', () => {
            expect(() => logger.info('message', {})).not.toThrow()
        })

        test('handles null context gracefully', () => {
            expect(() => logger.info('message')).not.toThrow()
        })
    })
})