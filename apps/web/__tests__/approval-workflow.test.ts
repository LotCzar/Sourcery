import "./setup";
import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockAuth } from "./mocks/clerk";
import {
  createMockUser,
  createMockUserWithRestaurant,
  createMockOrder,
  createMockApprovalRule,
  createMockOrderApproval,
  createMockSupplier,
} from "./fixtures";
import { createJsonRequest, createRequest, parseResponse } from "./helpers";
import { Decimal } from "@prisma/client/runtime/library";

// ---------------------------------------------------------------------------
// Order submission — approval rule checks (PATCH /api/orders/[id])
// ---------------------------------------------------------------------------
describe("PATCH /api/orders/[id] — submit with approval rules", () => {
  let PATCH: (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/orders/[id]/route");
    PATCH = mod.PATCH;
  });

  // 1. Order below threshold goes directly to PENDING
  it("submits order directly to PENDING when total is below approval threshold", async () => {
    const user = createMockUserWithRestaurant({ role: "STAFF" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "DRAFT",
      total: new Decimal("100.00"),
      subtotal: new Decimal("90.00"),
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    // Rule requires MANAGER for orders >= $500
    prismaMock.approvalRule.findMany.mockResolvedValueOnce([
      createMockApprovalRule({ minAmount: new Decimal("500.00") }),
    ] as any);

    const updatedOrder = createMockOrder({ status: "PENDING" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1",
      { action: "submit" },
      "PATCH"
    );
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  // 2. Order above threshold goes to AWAITING_APPROVAL for STAFF
  it("sends order to AWAITING_APPROVAL when STAFF submits above threshold", async () => {
    const user = createMockUserWithRestaurant({ role: "STAFF" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "DRAFT",
      total: new Decimal("750.00"),
      subtotal: new Decimal("700.00"),
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    // Rule: orders >= $500 require MANAGER approval
    prismaMock.approvalRule.findMany.mockResolvedValueOnce([
      createMockApprovalRule({
        minAmount: new Decimal("500.00"),
        requiredRole: "MANAGER",
      }),
    ] as any);

    const updatedOrder = createMockOrder({ status: "AWAITING_APPROVAL" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);
    prismaMock.orderApproval.create.mockResolvedValueOnce(
      createMockOrderApproval() as any
    );

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1",
      { action: "submit" },
      "PATCH"
    );
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "AWAITING_APPROVAL" },
      })
    );
    expect(prismaMock.orderApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order_1",
          requestedById: user.id,
          status: "PENDING",
        }),
      })
    );
  });

  // 3. MANAGER bypasses MANAGER-required approval rules
  it("allows MANAGER to bypass MANAGER-required approval rules", async () => {
    const user = createMockUserWithRestaurant({ role: "MANAGER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "DRAFT",
      total: new Decimal("750.00"),
      subtotal: new Decimal("700.00"),
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    // Rule: orders >= $500 require MANAGER — but user IS a MANAGER
    prismaMock.approvalRule.findMany.mockResolvedValueOnce([
      createMockApprovalRule({
        minAmount: new Decimal("500.00"),
        requiredRole: "MANAGER",
      }),
    ] as any);

    const updatedOrder = createMockOrder({ status: "PENDING" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1",
      { action: "submit" },
      "PATCH"
    );
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
    // Should NOT create an approval record
    expect(prismaMock.orderApproval.create).not.toHaveBeenCalled();
  });

  // 4. OWNER bypasses all approval rules
  it("allows OWNER to bypass all approval rules regardless of threshold", async () => {
    const user = createMockUserWithRestaurant({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "DRAFT",
      total: new Decimal("5000.00"),
      subtotal: new Decimal("4500.00"),
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    // Rule: orders >= $1000 require OWNER — OWNER has same or higher level
    prismaMock.approvalRule.findMany.mockResolvedValueOnce([
      createMockApprovalRule({
        minAmount: new Decimal("1000.00"),
        requiredRole: "OWNER",
      }),
    ] as any);

    const updatedOrder = createMockOrder({ status: "PENDING" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1",
      { action: "submit" },
      "PATCH"
    );
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
    expect(prismaMock.orderApproval.create).not.toHaveBeenCalled();
  });

  // 10. No rules = direct PENDING (backward compatible)
  it("submits directly to PENDING when no approval rules exist", async () => {
    const user = createMockUserWithRestaurant({ role: "STAFF" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "DRAFT",
      total: new Decimal("2000.00"),
      subtotal: new Decimal("1800.00"),
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    // No approval rules at all
    prismaMock.approvalRule.findMany.mockResolvedValueOnce([]);

    const updatedOrder = createMockOrder({ status: "PENDING" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1",
      { action: "submit" },
      "PATCH"
    );
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
    expect(prismaMock.orderApproval.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Approval review (POST /api/orders/[id]/approval)
// ---------------------------------------------------------------------------
describe("POST /api/orders/[id]/approval — approve/reject", () => {
  let POST: (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/orders/[id]/approval/route");
    POST = mod.POST;
  });

  // 5. Approve transitions order to PENDING
  it("transitions order to PENDING when approved by MANAGER", async () => {
    const manager = createMockUserWithRestaurant({ id: "mgr_1", role: "MANAGER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(manager as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "AWAITING_APPROVAL",
      total: new Decimal("750.00"),
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    const requester = createMockUser({ id: "staff_1", role: "STAFF", email: "staff@test.com" });
    const approval = createMockOrderApproval({
      requestedById: "staff_1",
    });
    prismaMock.orderApproval.findFirst.mockResolvedValueOnce({
      ...approval,
      requestedBy: requester,
    } as any);

    prismaMock.orderApproval.update.mockResolvedValueOnce({
      ...approval,
      status: "APPROVED",
      reviewedById: "mgr_1",
    } as any);

    const updatedOrder = createMockOrder({ status: "PENDING" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);
    prismaMock.notification.create.mockResolvedValueOnce({} as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/approval",
      { status: "APPROVED" },
      "POST"
    );
    const response = await POST(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  // 6. Reject transitions order back to DRAFT
  it("transitions order back to DRAFT when rejected", async () => {
    const manager = createMockUserWithRestaurant({ id: "mgr_1", role: "MANAGER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(manager as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "AWAITING_APPROVAL",
      orderNumber: "ORD-REJECT-001",
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    const requester = createMockUser({ id: "staff_1", role: "STAFF", email: "staff@test.com" });
    const approval = createMockOrderApproval({
      requestedById: "staff_1",
    });
    prismaMock.orderApproval.findFirst.mockResolvedValueOnce({
      ...approval,
      requestedBy: requester,
    } as any);

    prismaMock.orderApproval.update.mockResolvedValueOnce({
      ...approval,
      status: "REJECTED",
      reviewedById: "mgr_1",
    } as any);

    const updatedOrder = createMockOrder({ status: "DRAFT" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);
    prismaMock.notification.create.mockResolvedValueOnce({} as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/approval",
      { status: "REJECTED", notes: "Over budget" },
      "POST"
    );
    const response = await POST(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: { status: "DRAFT" },
      })
    );
  });

  // 7. Non-authorized user (STAFF) cannot review approval
  it("returns 403 when STAFF tries to review an approval", async () => {
    const staff = createMockUserWithRestaurant({ role: "STAFF" });
    prismaMock.user.findUnique.mockResolvedValueOnce(staff as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/approval",
      { status: "APPROVED" },
      "POST"
    );
    const response = await POST(req, {
      params: Promise.resolve({ id: "order_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(403);
    expect(data.error).toContain("Insufficient permissions");
  });

  // 8. Approval creates notification for requester
  it("creates a notification for the requester upon approval", async () => {
    const owner = createMockUserWithRestaurant({
      id: "owner_1",
      role: "OWNER",
      firstName: "Jane",
      lastName: "Owner",
    });
    prismaMock.user.findUnique.mockResolvedValueOnce(owner as any);

    const supplier = createMockSupplier();
    const order = createMockOrder({
      status: "AWAITING_APPROVAL",
      orderNumber: "ORD-NOTIF-001",
    });
    prismaMock.order.findFirst.mockResolvedValueOnce({
      ...order,
      supplier,
    } as any);

    const requester = createMockUser({
      id: "staff_1",
      role: "STAFF",
      email: "staff@test.com",
    });
    const approval = createMockOrderApproval({
      requestedById: "staff_1",
    });
    prismaMock.orderApproval.findFirst.mockResolvedValueOnce({
      ...approval,
      requestedBy: requester,
    } as any);

    prismaMock.orderApproval.update.mockResolvedValueOnce({
      ...approval,
      status: "APPROVED",
      reviewedById: "owner_1",
    } as any);

    const updatedOrder = createMockOrder({ status: "PENDING" });
    prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);
    prismaMock.notification.create.mockResolvedValueOnce({} as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/approval",
      { status: "APPROVED" },
      "POST"
    );
    await POST(req, {
      params: Promise.resolve({ id: "order_1" }),
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "ORDER_UPDATE",
          title: "Order Approved",
          userId: "staff_1",
          metadata: expect.objectContaining({
            orderId: "order_1",
            status: "APPROVED",
          }),
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Approval rules CRUD (GET/POST /api/approval-rules, DELETE /api/approval-rules/[id])
// ---------------------------------------------------------------------------
describe("Approval rules CRUD", () => {
  let rulesGET: (req: Request) => Promise<Response>;
  let rulesPOST: (req: Request) => Promise<Response>;
  let ruleDELETE: (
    req: Request,
    ctx: { params: Promise<{ id: string }> }
  ) => Promise<Response>;

  beforeEach(async () => {
    const rulesModule = await import("@/app/api/approval-rules/route");
    rulesGET = rulesModule.GET;
    rulesPOST = rulesModule.POST;

    const ruleIdModule = await import("@/app/api/approval-rules/[id]/route");
    ruleDELETE = ruleIdModule.DELETE;
  });

  // 9a. GET returns approval rules for the restaurant
  it("GET returns approval rules for the restaurant", async () => {
    const user = createMockUserWithRestaurant({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const rules = [
      createMockApprovalRule({
        id: "rule_1",
        minAmount: new Decimal("500.00"),
        requiredRole: "MANAGER",
      }),
      createMockApprovalRule({
        id: "rule_2",
        minAmount: new Decimal("2000.00"),
        requiredRole: "OWNER",
      }),
    ];
    prismaMock.approvalRule.findMany.mockResolvedValueOnce(rules as any);

    const req = createRequest("http://localhost/api/approval-rules");
    const response = await rulesGET(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].minAmount).toBe(500);
    expect(data.data[1].minAmount).toBe(2000);
  });

  // 9b. POST creates an approval rule (OWNER/MANAGER only)
  it("POST creates an approval rule when user is OWNER", async () => {
    const user = createMockUserWithRestaurant({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const createdRule = createMockApprovalRule({
      minAmount: new Decimal("300.00"),
      requiredRole: "MANAGER",
    });
    prismaMock.approvalRule.create.mockResolvedValueOnce(createdRule as any);

    const req = createJsonRequest("http://localhost/api/approval-rules", {
      minAmount: 300,
      requiredRole: "MANAGER",
    });
    const response = await rulesPOST(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.minAmount).toBe(300);
    expect(prismaMock.approvalRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          minAmount: 300,
          requiredRole: "MANAGER",
          restaurantId: "rest_1",
        }),
      })
    );
  });

  // 9c. DELETE only allowed for OWNER
  it("DELETE returns 403 for MANAGER role", async () => {
    const user = createMockUserWithRestaurant({ role: "MANAGER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const req = createRequest("http://localhost/api/approval-rules/rule_1", {
      method: "DELETE",
    });
    const response = await ruleDELETE(req, {
      params: Promise.resolve({ id: "rule_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(403);
    expect(data.error).toContain("Only owners");
  });

  it("DELETE succeeds for OWNER", async () => {
    const user = createMockUserWithRestaurant({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const rule = createMockApprovalRule();
    prismaMock.approvalRule.findFirst.mockResolvedValueOnce(rule as any);
    prismaMock.approvalRule.delete.mockResolvedValueOnce(rule as any);

    const req = createRequest("http://localhost/api/approval-rules/rule_1", {
      method: "DELETE",
    });
    const response = await ruleDELETE(req, {
      params: Promise.resolve({ id: "rule_1" }),
    });
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Rule deleted");
    expect(prismaMock.approvalRule.delete).toHaveBeenCalledWith({
      where: { id: "rule_1" },
    });
  });
});
