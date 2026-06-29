'use strict'

/**
 * db-helper.test.js
 * ──────────────────
 * Strategy: inject SELECT as global before each test,
 * mock cds.connect.to to return a controlled db object,
 * and avoid resetModules (which clears the mock setup).
 */

// ── Step 1: Inject CAP globals BEFORE anything is required ────────────────────
const mockRun = jest.fn()

const mockChainable = {
    columns: jest.fn(),
    where:   jest.fn(),
    orderBy: jest.fn(),
    limit:   jest.fn()
}

// Each chainable method returns itself so chains work: .from().columns().orderBy()
Object.values(mockChainable).forEach(fn => fn.mockReturnValue(mockChainable))

global.SELECT = {
    from: jest.fn().mockReturnValue(mockChainable),
    one:  { from: jest.fn().mockReturnValue(mockChainable) }
}
global.INSERT = { into: jest.fn().mockReturnValue({ entries: jest.fn() }) }
global.UPDATE = jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn() }) })
global.DELETE = { from: jest.fn().mockReturnValue({ where: jest.fn() }) }

// ── Step 2: Mock @sap/cds BEFORE requiring db-helper ─────────────────────────
jest.mock('@sap/cds', () => ({
    connect: { to: jest.fn() },
    log: () => ({
        info:  jest.fn(),
        warn:  jest.fn(),
        error: jest.fn()
    })
}))

// ── Step 3: Require AFTER mocks are set up ────────────────────────────────────
const cds          = require('@sap/cds')
const dbHelper     = require('../../../srv/helpers/db-helper')
const { DataFetchError } = require('../../../srv/utils/errors')

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
    { sku: 'P001', name: 'CPU', stockLevel: 45,  reorderPoint: 50,  unitCost: 320, warehouse: 'WH-Berlin'   },
    { sku: 'P002', name: 'RAM', stockLevel: 120, reorderPoint: 100, unitCost: 85,  warehouse: 'WH-Berlin'   },
    { sku: 'P003', name: 'SSD', stockLevel: 0,   reorderPoint: 80,  unitCost: 65,  warehouse: 'WH-Shanghai' }
]

const MOCK_SUPPLIERS = [
    { ID: 'S001', name: 'TechParts',  riskScore: 15, status: 'Active',    onTimeDelivery: 97.5 },
    { ID: 'S004', name: 'AsiaComp',   riskScore: 62, status: 'Probation', onTimeDelivery: 78.4 },
    { ID: 'S008', name: 'GlobalChem', riskScore: 55, status: 'Probation', onTimeDelivery: 81.7 }
]

const MOCK_SHIPMENTS = [
    {
        trackingNumber:   'DHL-001',
        status:           'Delivered',
        carrier:          'DHL',
        actualArrival:    '2026-05-14',
        estimatedArrival: '2026-05-14'
    },
    {
        trackingNumber: 'FDX-002',
        status:         'Delayed',
        carrier:        'FedEx',
        delayReason:    'Customs issue'
    },
    {
        trackingNumber:   'UPS-003',
        status:           'InTransit',
        carrier:          'UPS',
        estimatedArrival: '2026-07-01'
    }
]

// ── Helper: setup mock DB for each test ───────────────────────────────────────
function setupMockDb(returnData) {
    mockRun.mockResolvedValue(returnData)
    cds.connect.to.mockResolvedValue({ run: mockRun })
}

// ── Reset mocks between tests (but NOT modules) ───────────────────────────────
beforeEach(() => {
    jest.clearAllMocks()

    // Re-apply chainable returns after clearAllMocks
    Object.values(mockChainable).forEach(fn => fn.mockReturnValue(mockChainable))
    global.SELECT.from.mockReturnValue(mockChainable)
    global.SELECT.one.from.mockReturnValue(mockChainable)

    // IMPORTANT: reset the db singleton inside db-helper
    // so each test gets a fresh cds.connect.to() call
    dbHelper.__resetForTesting?.()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('db-helper.js', () => {

    describe('getInventoryContext()', () => {

        test('classifies products correctly', async () => {
            setupMockDb(MOCK_PRODUCTS)

            const ctx = await dbHelper.getInventoryContext()

            expect(ctx.products).toHaveLength(3)
            expect(ctx.critical).toHaveLength(1)   // stockLevel === 0
            expect(ctx.low).toHaveLength(1)         // below reorder, not zero
            expect(ctx.healthy).toHaveLength(1)     // above reorder
        })

        test('calculates total inventory value correctly', async () => {
            setupMockDb(MOCK_PRODUCTS)

            const ctx = await dbHelper.getInventoryContext()

            // 45*320 + 120*85 + 0*65 = 14400 + 10200 + 0 = 24600
            expect(ctx.totalValue).toBe(24600)
        })

        test('throws DataFetchError when DB fails', async () => {
            mockRun.mockRejectedValue(new Error('DB connection lost'))
            cds.connect.to.mockResolvedValue({ run: mockRun })

            await expect(dbHelper.getInventoryContext())
                .rejects.toThrow(DataFetchError)
        })
    })

    describe('getSupplierContext()', () => {

        test('classifies suppliers by risk level', async () => {
            setupMockDb(MOCK_SUPPLIERS)

            const ctx = await dbHelper.getSupplierContext()

            expect(ctx.high).toHaveLength(2)       // riskScore 50-74
            expect(ctx.low).toHaveLength(1)        // riskScore < 25
            expect(ctx.probation).toHaveLength(2)  // status === Probation
        })

        test('calculates average risk score', async () => {
            setupMockDb(MOCK_SUPPLIERS)

            const ctx = await dbHelper.getSupplierContext()

            // (15 + 62 + 55) / 3 = 44.0
            expect(parseFloat(ctx.avgRisk)).toBeCloseTo(44.0, 1)
        })
    })

    describe('getDeliveryContext()', () => {

        test('classifies shipments by status', async () => {
            setupMockDb(MOCK_SHIPMENTS)

            const ctx = await dbHelper.getDeliveryContext()

            expect(ctx.delayed).toHaveLength(1)
            expect(ctx.inTransit).toHaveLength(1)
            expect(ctx.delivered).toHaveLength(1)
        })

        test('calculates on-time delivery rate', async () => {
            setupMockDb(MOCK_SHIPMENTS)

            const ctx = await dbHelper.getDeliveryContext()

            // 1 delivered on time out of 1 total delivered = 100%
            expect(ctx.onTimeRate).toBe('100.0')
        })
    })
})