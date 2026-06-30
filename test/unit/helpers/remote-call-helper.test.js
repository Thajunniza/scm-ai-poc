'use strict'

jest.mock('@sap/cds', () => ({
    log: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}))

jest.mock('child_process', () => ({
    execFileSync: jest.fn()
}))

jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    readFileSync:  jest.fn(),
    unlinkSync:    jest.fn()
}))

const { execFileSync } = require('child_process')
const fs = require('fs')

beforeEach(() => {
    jest.clearAllMocks()
})

describe('remote-call-helper.js', () => {

    describe('callAgent() — success', () => {
        test('returns reply and token usage on successful bridge call', async () => {
            execFileSync.mockReturnValue(Buffer.from(''))
            fs.readFileSync.mockReturnValue(JSON.stringify({
                success: true,
                content: 'Hello from GenAI Hub',
                model: 'sap/gpt-4o',
                input_tokens: 13,
                output_tokens: 8,
                total_tokens: 21
            }))

            const { callAgent } = require('../../../srv/helpers/remote-call-helper')

            const result = await callAgent({
                agentName: 'InventoryAgent',
                prompt: [{ role: 'user', content: 'test' }],
                req: { user: { id: 'test-user' } }
            })

            expect(result.reply).toBe('Hello from GenAI Hub')
            expect(result.inputTokens).toBe(13)
            expect(result.outputTokens).toBe(8)
            expect(result.simulated).toBe(false)
        })
    })

    describe('callAgent() — bridge returns error', () => {
        test('falls back to simulation when bridge reports success=false', async () => {
            execFileSync.mockReturnValue(Buffer.from(''))
            fs.readFileSync.mockReturnValue(JSON.stringify({ success: false, error: 'AI Core 503' }))

            const { callAgent } = require('../../../srv/helpers/remote-call-helper')

            const result = await callAgent({
                agentName: 'InventoryAgent',
                prompt: [{ role: 'user', content: 'test' }],
                req: {}
            })

            expect(result.simulated).toBe(true)
            expect(result.reply).toBeNull()
        })
    })

    describe('callAgent() — process execution fails', () => {
        test('falls back to simulation when python process throws/times out', async () => {
            execFileSync.mockImplementation(() => { throw new Error('Command failed') })

            const { callAgent } = require('../../../srv/helpers/remote-call-helper')

            const result = await callAgent({
                agentName: 'InventoryAgent',
                prompt: [{ role: 'user', content: 'test' }],
                req: {}
            })

            expect(result.simulated).toBe(true)
            expect(result.reply).toBeNull()
        })
    })

    describe('checkStackHealth()', () => {
        test('returns healthy=true when bridge responds successfully', async () => {
            execFileSync.mockReturnValue(Buffer.from(''))
            fs.readFileSync.mockReturnValue(JSON.stringify({
                success: true, content: 'pong', model: 'sap/gpt-4o', input_tokens: 1, output_tokens: 1
            }))

            const { checkStackHealth } = require('../../../srv/helpers/remote-call-helper')
            const result = await checkStackHealth()

            expect(result.healthy).toBe(true)
        })

        test('returns healthy=false when bridge fails', async () => {
            execFileSync.mockImplementation(() => { throw new Error('fail') })

            const { checkStackHealth } = require('../../../srv/helpers/remote-call-helper')
            const result = await checkStackHealth()

            expect(result.healthy).toBe(false)
        })
    })
})