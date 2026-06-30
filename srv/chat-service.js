'use strict'

/**
 * chat-service.js
 * ────────────────
 * Thin orchestrator — wires router + agents together.
 * Contains zero business logic.
 */

const cds = require('@sap/cds')

const { detectIntent }       = require('./router/agent-router')
const inventoryAgent         = require('./agents/inventory-agent')
const deliveryAgent          = require('./agents/delivery-agent')
const supplierRiskAgent      = require('./agents/supplier-risk-agent')
const { validateChatRequest,
        validateMessage }    = require('./utils/validator')
const { clarificationResponse,
        errorResponse }      = require('./utils/formatter')
const { createLogger }       = require('./utils/logger')
const { INTENTS }            = require('./utils/constants')
const { SCMError }           = require('./utils/errors')
const { checkStackHealth } = require('./helpers/remote-call-helper')

const logger = createLogger('SCMChatService')

// ── Agent registry — add new agents here only ─────────────────────────────────
const AGENT_REGISTRY = {
    [INTENTS.INVENTORY]:     inventoryAgent,
    [INTENTS.DELIVERY]:      deliveryAgent,
    [INTENTS.SUPPLIER_RISK]: supplierRiskAgent
}

module.exports = class SCMChatService extends cds.ApplicationService {
    async init() {

        // ── Main chat action ──────────────────────────────────────────────────
        this.on('chat', async (req) => {
            try {
                // 1. Validate input
                const { message, agentHint } = validateChatRequest(req.data)

                // 2. Detect intent
                const { intent, confidence } = detectIntent(message, agentHint)

                // 3. Route to agent
                const agent = AGENT_REGISTRY[intent]
                if (!agent) {
                    return clarificationResponse()
                }

                // 4. Run agent
                const result = await agent.run(req, message)
                return { ...result, confidence }

            } catch (err) {
                logger.error('chat action failed', err)
                if (err instanceof SCMError) return errorResponse(err)
                return errorResponse({ code: 'UNKNOWN_ERROR', message: err.message })
            }
        })

        // ── Direct agent actions ──────────────────────────────────────────────
        this.on('askInventory', async (req) => {
            try {
                const message = validateMessage(req.data.message)
                return await inventoryAgent.run(req, message)
            } catch (err) {
                logger.error('askInventory failed', err)
                return errorResponse(err instanceof SCMError ? err : { code: 'UNKNOWN_ERROR', message: err.message })
            }
        })

        this.on('askDelivery', async (req) => {
            try {
                const message = validateMessage(req.data.message)
                return await deliveryAgent.run(req, message)
            } catch (err) {
                logger.error('askDelivery failed', err)
                return errorResponse(err instanceof SCMError ? err : { code: 'UNKNOWN_ERROR', message: err.message })
            }
        })

        this.on('askSupplierRisk', async (req) => {
            try {
                const message = validateMessage(req.data.message)
                return await supplierRiskAgent.run(req, message)
            } catch (err) {
                logger.error('askSupplierRisk failed', err)
                return errorResponse(err instanceof SCMError ? err : { code: 'UNKNOWN_ERROR', message: err.message })
            }
        })

        this.on('checkGenAiHealth', async (req) => {
            const result = await checkStackHealth()
            return {
                healthy: result.healthy,
                message: result.healthy
                    ? 'GenAI Hub bridge is responding normally'
                    : `GenAI Hub bridge unavailable: ${result.error || 'unknown error'}`
            }
        })

        return super.init()
    }
}