'use strict'

/**
 * db-helper.js
 * ─────────────
 * ALL database queries live here.
 * Agents never write raw DB queries —
 * they always call this helper.
 *
 * Benefits:
 *  - One place to optimize queries
 *  - Easy to mock in tests
 *  - Easy to switch from SQLite to HANA
 *  - Query logic separated from business logic
 */

const cds                = require('@sap/cds')
const { ENTITIES,
        SHIPMENT_STATUS,
        SUPPLIER_STATUS,
        RISK_LEVELS }    = require('../utils/constants')
const { DataFetchError } = require('../utils/errors')
const { createLogger }   = require('../utils/logger')

const logger = createLogger('DBHelper')

// ── DB connection (singleton) ─────────────────────────────────────────────────
let _db = null

async function getDb() {
    if (!_db) _db = await cds.connect.to('db')
    return _db
}

/**
 * Safe query wrapper — all queries go through this
 */
async function query(cdsQuery, context = '') {
    try {
        const db = await getDb()
        return await db.run(cdsQuery)
    } catch (err) {
        logger.error(`Query failed [${context}]`, err)
        throw new DataFetchError(
            `Database query failed: ${err.message}`,
            { context, originalError: err.message }
        )
    }
}

// ── Inventory Queries ─────────────────────────────────────────────────────────

/**
 * Get all products ordered by stock level (lowest first)
 */
async function getAllProducts() {
    logger.info('Fetching all products')
    return query(
        SELECT.from(ENTITIES.PRODUCTS)
            .columns(
                'sku', 'name', 'category',
                'stockLevel', 'reorderPoint',
                'maxStock', 'unitCost',
                'warehouse', 'supplier_ID',
                'lastUpdated'
            )
            .orderBy({ stockLevel: 'asc' }),
        'getAllProducts'
    )
}

/**
 * Get products below reorder point
 */
async function getLowStockProducts() {
    logger.info('Fetching low stock products')
    const products = await getAllProducts()
    return products.filter(p => p.stockLevel <= p.reorderPoint)
}

/**
 * Get products by warehouse
 */
async function getProductsByWarehouse(warehouse) {
    logger.info('Fetching products by warehouse', { warehouse })
    return query(
        SELECT.from(ENTITIES.PRODUCTS)
            .where({ warehouse }),
        'getProductsByWarehouse'
    )
}

/**
 * Get product by SKU
 */
async function getProductBySku(sku) {
    logger.info('Fetching product by SKU', { sku })
    return query(
        SELECT.one.from(ENTITIES.PRODUCTS)
            .where({ sku }),
        'getProductBySku'
    )
}

// ── Supplier Queries ──────────────────────────────────────────────────────────

/**
 * Get all suppliers ordered by risk score (highest first)
 */
async function getAllSuppliers() {
    logger.info('Fetching all suppliers')
    return query(
        SELECT.from(ENTITIES.SUPPLIERS)
            .orderBy({ riskScore: 'desc' }),
        'getAllSuppliers'
    )
}

/**
 * Get suppliers by risk category
 */
async function getSuppliersByRiskLevel(level) {
    const range = RISK_LEVELS[level.toUpperCase()]
    if (!range) throw new DataFetchError(`Invalid risk level: ${level}`)

    logger.info('Fetching suppliers by risk level', { level })
    const suppliers = await getAllSuppliers()
    return suppliers.filter(s =>
        s.riskScore >= range.min && s.riskScore <= range.max
    )
}

/**
 * Get suppliers on probation
 */
async function getProbationSuppliers() {
    logger.info('Fetching probation suppliers')
    return query(
        SELECT.from(ENTITIES.SUPPLIERS)
            .where({ status: SUPPLIER_STATUS.PROBATION })
            .orderBy({ riskScore: 'desc' }),
        'getProbationSuppliers'
    )
}

/**
 * Get supplier by ID
 */
async function getSupplierById(id) {
    logger.info('Fetching supplier by ID', { id })
    return query(
        SELECT.one.from(ENTITIES.SUPPLIERS)
            .where({ ID: id }),
        'getSupplierById'
    )
}

// ── Shipment Queries ──────────────────────────────────────────────────────────

/**
 * Get all shipments
 */
async function getAllShipments() {
    logger.info('Fetching all shipments')
    return query(
        SELECT.from(ENTITIES.SHIPMENTS)
            .columns(
                'trackingNumber', 'carrier',
                'origin', 'destination',
                'shipDate', 'estimatedArrival',
                'actualArrival', 'status',
                'lastLocation', 'delayReason',
                'po_ID'
            )
            .orderBy({ status: 'asc' }),
        'getAllShipments'
    )
}

/**
 * Get delayed shipments only
 */
async function getDelayedShipments() {
    logger.info('Fetching delayed shipments')
    return query(
        SELECT.from(ENTITIES.SHIPMENTS)
            .where({ status: SHIPMENT_STATUS.DELAYED }),
        'getDelayedShipments'
    )
}

/**
 * Get shipments by status
 */
async function getShipmentsByStatus(status) {
    logger.info('Fetching shipments by status', { status })
    return query(
        SELECT.from(ENTITIES.SHIPMENTS)
            .where({ status }),
        'getShipmentsByStatus'
    )
}

/**
 * Get shipment by tracking number
 */
async function getShipmentByTracking(trackingNumber) {
    logger.info('Fetching shipment by tracking', { trackingNumber })
    return query(
        SELECT.one.from(ENTITIES.SHIPMENTS)
            .where({ trackingNumber }),
        'getShipmentByTracking'
    )
}

// ── Purchase Order Queries ────────────────────────────────────────────────────

/**
 * Get all purchase orders
 */
async function getAllPurchaseOrders() {
    logger.info('Fetching all purchase orders')
    return query(
        SELECT.from(ENTITIES.PURCHASE_ORDERS)
            .orderBy({ orderDate: 'desc' }),
        'getAllPurchaseOrders'
    )
}

/**
 * Get purchase orders by status
 */
async function getPurchaseOrdersByStatus(status) {
    logger.info('Fetching POs by status', { status })
    return query(
        SELECT.from(ENTITIES.PURCHASE_ORDERS)
            .where({ status }),
        'getPurchaseOrdersByStatus'
    )
}

/**
 * Get purchase orders by supplier
 */
async function getPurchaseOrdersBySupplier(supplierId) {
    logger.info('Fetching POs by supplier', { supplierId })
    return query(
        SELECT.from(ENTITIES.PURCHASE_ORDERS)
            .where({ supplier_ID: supplierId })
            .orderBy({ orderDate: 'desc' }),
        'getPurchaseOrdersBySupplier'
    )
}

// ── Aggregate / Cross-entity Queries ─────────────────────────────────────────

/**
 * Get full inventory context (used by InventoryAgent)
 */
async function getInventoryContext() {
    const products   = await getAllProducts()
    const critical   = products.filter(p => p.stockLevel === 0)
    const low        = products.filter(p => p.stockLevel > 0 && p.stockLevel <= p.reorderPoint)
    const healthy    = products.filter(p => p.stockLevel > p.reorderPoint)
    const totalValue = products.reduce((sum, p) => sum + (p.stockLevel * p.unitCost), 0)

    return { products, critical, low, healthy, totalValue }
}

/**
 * Get full delivery context (used by DeliveryAgent)
 */
async function getDeliveryContext() {
    const shipments  = await getAllShipments()
    const delayed    = shipments.filter(s => s.status === SHIPMENT_STATUS.DELAYED)
    const inTransit  = shipments.filter(s => s.status === SHIPMENT_STATUS.IN_TRANSIT)
    const delivered  = shipments.filter(s => s.status === SHIPMENT_STATUS.DELIVERED)
    const pending    = shipments.filter(s => s.status === SHIPMENT_STATUS.PENDING)

    const finalized  = [...delivered]
    const onTime     = finalized.filter(s => s.actualArrival <= s.estimatedArrival)
    const onTimeRate = finalized.length > 0
        ? ((onTime.length / finalized.length) * 100).toFixed(1)
        : 'N/A'

    return { shipments, delayed, inTransit, delivered, pending, onTimeRate }
}

/**
 * Get full supplier context (used by SupplierRiskAgent)
 */
async function getSupplierContext() {
    const suppliers  = await getAllSuppliers()
    const critical   = suppliers.filter(s => s.riskScore >= RISK_LEVELS.CRITICAL.min)
    const high       = suppliers.filter(s => s.riskScore >= RISK_LEVELS.HIGH.min && s.riskScore < RISK_LEVELS.CRITICAL.min)
    const medium     = suppliers.filter(s => s.riskScore >= RISK_LEVELS.MEDIUM.min && s.riskScore < RISK_LEVELS.HIGH.min)
    const low        = suppliers.filter(s => s.riskScore < RISK_LEVELS.MEDIUM.min)
    const probation  = suppliers.filter(s => s.status === SUPPLIER_STATUS.PROBATION)
    const avgRisk    = suppliers.length > 0
        ? (suppliers.reduce((s, sup) => s + sup.riskScore, 0) / suppliers.length).toFixed(1)
        : 0

    return { suppliers, critical, high, medium, low, probation, avgRisk }
}

// ── Test helper — allows Jest to reset singleton between tests ────────────────
/* istanbul ignore next */
function __resetForTesting() { _db = null }

module.exports = {
    // Inventory
    getAllProducts,
    getLowStockProducts,
    getProductsByWarehouse,
    getProductBySku,

    // Suppliers
    getAllSuppliers,
    getSuppliersByRiskLevel,
    getProbationSuppliers,
    getSupplierById,

    // Shipments
    getAllShipments,
    getDelayedShipments,
    getShipmentsByStatus,
    getShipmentByTracking,

    // Purchase Orders
    getAllPurchaseOrders,
    getPurchaseOrdersByStatus,
    getPurchaseOrdersBySupplier,

    // Aggregate contexts
    getInventoryContext,
    getDeliveryContext,
    getSupplierContext,

    // Testing only
    __resetForTesting
}