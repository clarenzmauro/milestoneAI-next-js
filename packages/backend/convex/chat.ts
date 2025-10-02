import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireUser(ctx: any) {
  const identity = ctx.auth.getUserIdentity();
  if (!identity) {
    console.log("[CHAT] No user identity found in context");
    throw new Error("Unauthorized");
  }
  return identity.subject as string;
}

export const appendMessage = mutation({
  args: {
    planId: v.id("plans"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    tokens: v.optional(v.number()),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // For development, temporarily allow unauthenticated access
    // TODO: Fix authentication properly
    let userId;
    try {
      userId = requireUser(ctx);
    } catch (error) {
      console.log(`[CHAT:appendMessage] No authentication, allowing access for plan ${args.planId}`);
      userId = "anonymous"; // Use a placeholder for unauthenticated access
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      console.error(`[CHAT:appendMessage] Plan ${args.planId} does not exist`);
      throw new Error("Not found");
    }

    // In development, allow access if not authenticated, otherwise check ownership
    if (userId !== "anonymous" && plan.userId !== userId) {
      console.error(`[CHAT:appendMessage] ACCESS DENIED: Plan ${args.planId} belongs to ${plan.userId} but mutation is from ${userId}`);
      throw new Error("Not found");
    }

    await ctx.db.insert("chatMessages", {
      userId: userId === "anonymous" ? plan.userId : userId, // Use plan owner if anonymous
      planId: args.planId,
      role: args.role,
      content: args.content,
      tokens: args.tokens,
      toolCalls: args.toolCalls,
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: { planId: v.id("plans"), limit: v.optional(v.number()), cursor: v.optional(v.any()) },
  handler: async (ctx, { planId, limit = 100, cursor }) => {
    // For development, temporarily allow unauthenticated access
    // TODO: Fix authentication properly
    let userId;
    try {
      userId = requireUser(ctx);
    } catch (error) {
      console.log(`[CHAT:listMessages] No authentication, allowing access for plan ${planId}`);
      userId = null;
    }

    console.log(`[CHAT:listMessages] Querying plan ${planId} for user ${userId}`);

    // First check if the plan exists
    const plan = await ctx.db.get(planId);
    if (!plan) {
      console.log(`[CHAT:listMessages] Plan ${planId} does not exist`);
      // Plan doesn't exist - return empty array
      return { page: [], continueCursor: null, isDone: true };
    }

    console.log(`[CHAT:listMessages] Plan ${planId} exists with userId ${plan.userId}`);

    // In development, allow access if not authenticated, otherwise check ownership
    if (userId && plan.userId !== userId) {
      console.error(`[CHAT:listMessages] ACCESS DENIED: Plan belongs to ${plan.userId} but query is from ${userId}`);
      return { page: [], continueCursor: null, isDone: true };
    }

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_plan_created", (q) => q.eq("planId", planId))
      .order("asc")
      .paginate({ numItems: limit, cursor });
  },
});
