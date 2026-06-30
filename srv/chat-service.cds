using { scm } from '../db/schema';

service SCMChatService @(path: '/scm-chat') {
    type AgentResult {
        status     : String;
        reply      : String;
        agentUsed  : String;
        confidence : String;
        sources    : array of String;
        meta       : {
            durationMs   : Integer;
            inputTokens  : Integer;
            outputTokens : Integer;
            model        : String;
            simulated    : Boolean;
        };
        timestamp  : String;
    }

    @requires: 'SCMViewer'
    @readonly entity Suppliers      as projection on scm.Suppliers;

    @requires: 'SCMViewer'
    @readonly entity Products       as projection on scm.Products;

    @requires: 'SCMViewer'
    @readonly entity PurchaseOrders as projection on scm.PurchaseOrders;

    @requires: 'SCMViewer'
    @readonly entity Shipments      as projection on scm.Shipments;

    @requires: 'SCMAnalyst'
    action askInventory(message: String)    returns AgentResult;

    @requires: 'SCMAnalyst'
    action askDelivery(message: String)     returns AgentResult;

    @requires: 'SCMAnalyst'
    action askSupplierRisk(message: String) returns AgentResult;

    @requires: 'SCMAnalyst'
    action chat(
        message   : String,
        agentHint : String
    ) returns AgentResult;

    @requires: 'SCMViewer'
    action checkGenAiHealth() returns {
        healthy : Boolean;
        message : String;
    };
}