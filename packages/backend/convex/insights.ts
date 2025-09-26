import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

function requireUser(ctx: any) {
  const identity = ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity.subject as string;
}

export const listInsights = query({
  args: { planId: v.optional(v.id("plans")), limit: v.optional(v.number()), cursor: v.optional(v.any()) },
  handler: async (ctx, { planId, limit = 50, cursor }) => {
    const userId = requireUser(ctx);
    if (planId) {
      const plan = await ctx.db.get(planId);
      if (!plan || plan.userId !== userId) throw new Error("Not found");
      return await ctx.db
        .query("insights")
        .withIndex("by_plan_created", (q) => q.eq("planId", planId))
        .order("desc")
        .paginate({ numItems: limit, cursor });
    }
    return await ctx.db
      .query("insights")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ numItems: limit, cursor });
  },
});

export const upsertInsight = mutation({
  args: {
    planId: v.optional(v.id("plans")),
    kind: v.string(),
    text: v.string(),
    score: v.optional(v.number()),
    origin: v.union(v.literal("auto"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const userId = requireUser(ctx);
    if (args.planId) {
      const plan = await ctx.db.get(args.planId);
      if (!plan || plan.userId !== userId) throw new Error("Not found");
    }
    await ctx.db.insert("insights", {
      userId,
      planId: args.planId,
      kind: args.kind,
      text: args.text,
      score: args.score,
      origin: args.origin,
      createdAt: Date.now(),
    });
  },
});

export const recomputeInsightsForPlan = action({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const plan = await ctx.runQuery(api.plans.getPlan, { id: planId });
    if (!plan || plan.userId !== userId) throw new Error("Not found");

    const { page: messages } = await ctx.runQuery(api.chat.listMessages, { planId, limit: 100 });

    // Build prompt/context (placeholder)
    const prompt = `Generate insights based on the plan and latest chat. Plan goal: ${plan.goal}`;
    void prompt; // avoid unused var lint

    // TODO: call your AI provider with server-stored key and parse results
    const generatedInsights: Array<{ kind: string; text: string; score?: number }> = [];

    for (const ins of generatedInsights) {
      await ctx.runMutation(api.insights.upsertInsight, {
        planId,
        kind: ins.kind,
        text: ins.text,
        score: ins.score,
        origin: "auto",
      });
    }
  },
});
