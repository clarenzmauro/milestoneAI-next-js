import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return identity.subject as string;
}

export const addNote = mutation({
  args: { planId: v.optional(v.id("plans")), text: v.string(), pinned: v.optional(v.boolean()) },
  handler: async (ctx, { planId, text, pinned = false }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;
    if (planId) {
      const plan = await ctx.db.get(planId);
      if (!plan || plan.userId !== userId) throw new Error("Not found");
    }
    const now = Date.now();
    return await ctx.db.insert("notes", {
      userId,
      planId,
      text,
      pinned,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateNote = mutation({
  args: { noteId: v.id("notes"), patch: v.any() },
  handler: async (ctx, { noteId, patch }) => {
    const userId = await requireUser(ctx);
    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(noteId, { ...patch, updatedAt: Date.now() });
  },
});

export const listNotes = query({
  args: { planId: v.optional(v.id("plans")), limit: v.optional(v.number()), cursor: v.optional(v.any()) },
  handler: async (ctx, { planId, limit = 50, cursor }) => {
    const userId = await requireUser(ctx);
    if (planId) {
      const plan = await ctx.db.get(planId);
      if (!plan || plan.userId !== userId) throw new Error("Not found");
      return await ctx.db
        .query("notes")
        .withIndex("by_plan_created", (q) => q.eq("planId", planId))
        .order("desc")
        .paginate({ numItems: limit, cursor });
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ numItems: limit, cursor });
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const userId = await requireUser(ctx);
    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(noteId);
  },
});
