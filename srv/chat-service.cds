using { scm } from '../db/schema';

service SCMChatService @(path: '/scm-chat') {

    // ── Read-only views of SCM data ───────────────────────────────
    @readonly entity Suppliers      as projection on scm.Suppliers;
    @readonly entity Products       as projection on scm.Products;
    @readonly entity PurchaseOrders as projection on scm.PurchaseOrders;
    @readonly entity Shipments      as projection on scm.Shipments;

    // ── Agent actions ─────────────────────────────────────────────
    action askInventory(message: String)    returns String;
    action askDelivery(message: String)     returns String;
    action askSupplierRisk(message: String) returns String;

    // ── Main chatbot — auto routes to right agent ─────────────────
    action chat(
        message   : String,
        agentHint : String
    ) returns {
        reply     : String;
        agentUsed : String;
    };
}