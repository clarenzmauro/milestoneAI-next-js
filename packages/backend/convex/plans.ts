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
  handler: async (ctx, { userId, plan }) => {
    const id = await ctx.db.insert("plans", {
      userId,
      ...plan,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const listPlans = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const docs = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return docs;
  },
});

export const deletePlan = mutation({
  args: { id: v.id("plans"), userId: v.string() },
  handler: async (ctx, { id, userId }) => {
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return { success: false };
    await ctx.db.delete(id);
    return { success: true };
  },
});

export const deletePlansByGoal = mutation({
  args: { userId: v.string(), goal: v.string() },
  handler: async (ctx, { userId, goal }) => {
    const docs = await ctx.db
      .query("plans")
      .withIndex("by_user_goal", (q) => q.eq("userId", userId).eq("goal", goal))
      .collect();
    await Promise.all(docs.map((d) => ctx.db.delete(d._id)));
    return { deleted: docs.length };
  },
});


