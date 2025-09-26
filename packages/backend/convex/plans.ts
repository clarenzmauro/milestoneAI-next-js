import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * @description
 * Convex queries and mutations for plan persistence. Supports creating/saving plan
 * snapshots, listing plans by user, deleting a plan, and deleting all versions by goal.
 *
 * @receives data from:
 * - web app via Convex client: Plan CRUD requests
 *
 * @sends data to:
 * - Convex database: Reads/writes `plans` table
 *
 * @sideEffects:
 * - Creates, updates, and deletes documents in the Convex DB.
 */
export const savePlan = mutation({
  // Deprecated client arg `userId` retained for compatibility; identity is enforced server-side
  args: {
    userId: v.string(),
    plan: v.object({
      goal: v.string(),
      monthlyMilestones: v.array(v.object({
        month: v.number(),
        milestone: v.string(),
        weeklyObjectives: v.array(v.object({
          week: v.number(),
          objective: v.string(),
          dailyTasks: v.array(
            v.object({
              day: v.number(),
              description: v.string(),
              completed: v.boolean(),
            })
          ),
        })),
      })),
      chatHistory: v.optional(
        v.array(
          v.object({
            role: v.union(
              v.literal("user"),
              v.literal("ai"),
              v.literal("system")
            ),
            text: v.string(),
          })
        )
      ),
      interactionMode: v.optional(v.string()),
      unlockedAchievements: v.optional(v.record(v.string(), v.boolean())),
    }),
  },
  handler: async (ctx, { plan }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const now = Date.now();
    const id = await ctx.db.insert("plans", {
      userId: identity.subject,
      ...plan,
      createdAt: now,
      updatedAt: now,
      archived: false,
      status: "draft",
    });
    return id;
  },
});

export const listPlans = query({
  // Deprecated client arg `userId` retained; server uses authenticated user
  args: { userId: v.string() },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const docs = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
    return docs;
  },
});

export const deletePlan = mutation({
  // Deprecated client arg `userId` retained; server checks ownership
  args: { id: v.id("plans"), userId: v.string() },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== identity.subject) return { success: false };
    await ctx.db.delete(id);
    return { success: true };
  },
});

export const deletePlansByGoal = mutation({
  // Deprecated client arg `userId` retained; server uses authenticated user
  args: { userId: v.string(), goal: v.string() },
  handler: async (ctx, { goal }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const docs = await ctx.db
      .query("plans")
      .withIndex("by_user_goal", (q) => q.eq("userId", identity.subject).eq("goal", goal))
      .collect();
    await Promise.all(docs.map((d) => ctx.db.delete(d._id)));
    return { deleted: docs.length };
  },
});

// Additional secured plan APIs
export const getPlan = query({
  args: { id: v.id("plans") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== identity.subject) throw new Error("Not found");
    return doc;
  },
});

export const updatePlan = mutation({
  args: { id: v.id("plans"), patch: v.any() },
  handler: async (ctx, { id, patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== identity.subject) throw new Error("Not found");
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});

export const archivePlan = mutation({
  args: { id: v.id("plans"), archived: v.optional(v.boolean()) },
  handler: async (ctx, { id, archived = true }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== identity.subject) throw new Error("Not found");
    await ctx.db.patch(id, { archived, updatedAt: Date.now() });
  },
});


