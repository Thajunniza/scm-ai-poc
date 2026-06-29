'use strict'

jest.mock('@sap/cds', () => ({
    log: () => ({
        info:  jest.fn(),
        warn:  jest.fn(),
        error: jest.fn()
    })
}))

describe('remote-call-helper.js', () => {

    beforeEach(() => {
        jest.resetModules()
        // Default to node stack
        process.env.AGENT_STACK = 'node'
    })

    describe('getActiveStack()', () => {

        test('returns node when AGENT_STACK=node', () => {
            process.env.AGENT_STACK = 'node'
            const { getActiveStack } = require('../../../srv/helpers/remote-call-helper')
            expect(getActiveStack()).toBe('node')
        })

        test('returns python when AGENT_STACK=python', () => {
            process.env.AGENT_STACK = 'python'
            const { getActiveStack } = require('../../../srv/helpers/remote-call-helper')
            expect(getActiveStack()).toBe('python')
        })

        test('defaults to node for unknown stack', () => {
            process.env.AGENT_STACK = 'unknown'
            const { getActiveStack } = require('../../../srv/helpers/remote-call-helper')
            expect(getActiveStack()).toBe('node')
        })
    })

    describe('callAgent() — fallback behaviour', () => {

        test('returns simulation fallback when stack is unreachable', async () => {
            // Mock fetch to simulate ECONNREFUSED
            global.fetch = jest.fn().mockRejectedValue(
                Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' })
            )

            const { callAgent } = require('../../../srv/helpers/remote-call-helper')

            const result = await callAgent({
                agentName: 'InventoryAgent',
                message:   'What is low on stock?',
                context:   {},
                prompt:    'test prompt',
                req:       { user: { id: 'test-user' }, headers: {} }
            })

            expect(result.simulated).toBe(true)
            expect(result.reply).toContain('SIMULATION')
        })
    })
})