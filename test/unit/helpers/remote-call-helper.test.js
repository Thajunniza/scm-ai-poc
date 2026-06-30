'use strict'

jest.mock('@sap/cds', () => ({
    log: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}))

const { EventEmitter } = require('events')

// ── Mock child_process.spawn ───────────────────────────────────────────────────
jest.mock('child_process', () => ({
    spawn: jest.fn()
}))

const { spawn } = require('child_process')

function makeMockChild({ stdout = '', stderr = '', exitCode = 0, error = null }) {
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.stdin = { write: jest.fn(), end: jest.fn() }
    child.kill = jest.fn()

    setImmediate(() => {
        if (error) {
            child.emit('error', error)
            return
        }
        if (stdout) child.stdout.emit('data', Buffer.from(stdout))
        if (stderr) child.stderr.emit('data', Buffer.from(stderr))
        child.emit('close', exitCode)
    })

    return child
}

beforeEach(() => {
    jest.clearAllMocks()
})

describe('remote-call-helper.js', () => {

    describe('callAgent() — success', () => {
        test('returns reply and token usage on successful bridge call', async () => {
            spawn.mockReturnValue(makeMockChild({
                stdout: JSON.stringify({
                    success: true,
                    content: 'Hello from GenAI Hub',
                    model: 'sap/gpt-4o',
                    input_tokens: 13,
                    output_tokens: 8,
                    total_tokens: 21
                })
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
        test('falls back to simulation when bridge reports success=false (e.g. SAP 503)', async () => {
            spawn.mockReturnValue(makeMockChild({
                stdout: JSON.stringify({ success: false, error: 'AI Core auth failed' })
            }))

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

    describe('callAgent() — process spawn fails', () => {
        test('falls back to simulation when Python process cannot spawn', async () => {
            spawn.mockReturnValue(makeMockChild({
                error: Object.assign(new Error('spawn python ENOENT'), { code: 'ENOENT' })
            }))

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

    describe('callAgent() — invalid JSON from bridge', () => {
        test('falls back to simulation when bridge output is not valid JSON', async () => {
            spawn.mockReturnValue(makeMockChild({
                stdout: 'not json at all'
            }))

            const { callAgent } = require('../../../srv/helpers/remote-call-helper')

            const result = await callAgent({
                agentName: 'InventoryAgent',
                prompt: [{ role: 'user', content: 'test' }],
                req: {}
            })

            expect(result.simulated).toBe(true)
        })
    })

    describe('checkStackHealth()', () => {
        test('returns healthy=true when bridge responds successfully', async () => {
            spawn.mockReturnValue(makeMockChild({
                stdout: JSON.stringify({ success: true, content: 'pong', model: 'sap/gpt-4o', input_tokens: 1, output_tokens: 1 })
            }))

            const { checkStackHealth } = require('../../../srv/helpers/remote-call-helper')
            const result = await checkStackHealth()

            expect(result.healthy).toBe(true)
            expect(result.bridge).toBe('python-genai-bridge')
        })

        test('returns healthy=false when bridge spawn fails', async () => {
            spawn.mockReturnValue(makeMockChild({
                error: Object.assign(new Error('spawn python ENOENT'), { code: 'ENOENT' })
            }))

            const { checkStackHealth } = require('../../../srv/helpers/remote-call-helper')
            const result = await checkStackHealth()

            expect(result.healthy).toBe(false)
        })
    })
})