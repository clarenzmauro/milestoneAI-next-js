import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireUser(ctx: any) {
  const identity = ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
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
    const userId = requireUser(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) throw new Error("Not found");
    await ctx.db.insert("chatMessages", {
      userId,
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
    const userId = requireUser(ctx);
    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== userId) throw new Error("Not found");
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_plan_created", (q) => q.eq("planId", planId))
      .order("asc")
      .paginate({ numItems: limit, cursor });
  },
});
