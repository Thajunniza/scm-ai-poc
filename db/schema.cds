namespace scm;

using { cuid, managed } from '@sap/cds/common';

// ── Suppliers ─────────────────────────────────────────────────────
entity Suppliers : cuid {
    name            : String(200);
    country         : String(100);
    category        : String(100);
    riskScore       : Integer;
    onTimeDelivery  : Decimal(5,2);
    qualityScore    : Decimal(5,2);
    status          : String(20);
    since           : Date;
}

// ── Products / Inventory ──────────────────────────────────────────
entity Products : cuid {
    sku             : String(50);
    name            : String(200);
    category        : String(100);
    stockLevel      : Integer;
    reorderPoint    : Integer;
    maxStock        : Integer;
    unitCost        : Decimal(10,2);
    supplier        : Association to Suppliers;
    warehouse       : String(100);
    lastUpdated     : Date;
}

// ── Purchase Orders ───────────────────────────────────────────────
entity PurchaseOrders : cuid {
    poNumber        : String(50);
    supplier        : Association to Suppliers;
    orderDate       : Date;
    expectedDate    : Date;
    actualDate      : Date;
    status          : String(30);
    totalValue      : Decimal(15,2);
    currency        : String(3);
}

// ── Shipments ─────────────────────────────────────────────────────
entity Shipments : cuid {
    trackingNumber  : String(100);
    po              : Association to PurchaseOrders;
    carrier         : String(100);
    origin          : String(200);
    destination     : String(200);
    shipDate        : Date;
    estimatedArrival: Date;
    actualArrival   : Date;
    status          : String(30);
    lastLocation    : String(200);
    delayReason     : String(500);
}