import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireUser(ctx: any) {
  return ctx.auth.getUserIdentity();
}

export const appendMessage = mutation({
  args: {
    planId: v.id("plans"),
    taskIdentifier: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    tokens: v.optional(v.number()),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      console.error(`[CHAT:appendMessage] Plan ${args.planId} does not exist`);
      throw new Error("Not found");
    }

    // Check plan ownership
    if (plan.userId !== identity.subject) {
      console.error(`[CHAT:appendMessage] ACCESS DENIED: Plan ${args.planId} belongs to ${plan.userId} but mutation is from ${identity.subject}`);
      throw new Error("Not found");
    }

    await ctx.db.insert("chatMessages", {
      userId: identity.subject,
      planId: args.planId,
      taskIdentifier: args.taskIdentifier,
      role: args.role,
      content: args.content,
      tokens: args.tokens,
      toolCalls: args.toolCalls,
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: {
    planId: v.id("plans"),
    taskIdentifier: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.any())
  },
  handler: async (ctx, { planId, taskIdentifier, limit = 100, cursor }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    console.log(`[CHAT:listMessages] Querying plan ${planId}, task ${taskIdentifier} for user ${identity.subject}`);

    // First check if the plan exists
    const plan = await ctx.db.get(planId);
    if (!plan) {
      console.log(`[CHAT:listMessages] Plan ${planId} does not exist`);
      // Plan doesn't exist - return empty array
      return { page: [], continueCursor: null, isDone: true };
    }

    console.log(`[CHAT:listMessages] Plan ${planId} exists with userId ${plan.userId}`);

    // Check plan ownership
    if (plan.userId !== identity.subject) {
      console.error(`[CHAT:listMessages] ACCESS DENIED: Plan belongs to ${plan.userId} but query is from ${identity.subject}`);
      return { page: [], continueCursor: null, isDone: true };
    }

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_plan_task_created", (q) => q.eq("planId", planId).eq("taskIdentifier", taskIdentifier))
      .order("asc")
      .paginate({ numItems: limit, cursor });
  },
});

export const listMessagesForPlan = query({
  args: {
    planId: v.id("plans"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.any())
  },
  handler: async (ctx, { planId, limit = 100, cursor }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check plan ownership
    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== identity.subject) {
      return { page: [], continueCursor: null, isDone: true };
    }

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("planId"), planId))
      .order("desc")
      .paginate({ numItems: limit, cursor });
  },
});
