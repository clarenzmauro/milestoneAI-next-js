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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    if (planId) {
      const plan = await ctx.db.get(planId);
      if (!plan || plan.userId !== userId) {
        return { page: [], continueCursor: null, isDone: true };
      }

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

export const insertInsight = mutation({
  args: {
    userId: v.string(),
    planId: v.optional(v.id("plans")),
    kind: v.string(),
    text: v.string(),
    score: v.optional(v.number()),
    origin: v.union(v.literal("auto"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    // Basic validation - ensure the user owns the plan if planId is provided
    if (args.planId) {
      const plan = await ctx.db.get(args.planId);
      if (!plan || plan.userId !== args.userId) {
        throw new Error("Not authorized");
      }
    }

    return await ctx.db.insert("insights", {
      userId: args.userId,
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
  args: { planId: v.id("plans"), userTimezone: v.optional(v.string()) },
  handler: async (ctx, { planId, userTimezone }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const plan = await ctx.runQuery(api.plans.getPlan, { id: planId });
    if (!plan) {
      throw new Error("Plan not found");
    }
    if (plan.userId !== userId) {
      throw new Error("Not authorized");
    }

    const { page: messages } = await ctx.runQuery(api.chat.listMessagesForPlan, { planId, limit: 20 });

    // Calculate all metrics in code for accuracy
    const totalTasks = plan.monthlyMilestones.flatMap(month =>
      month.weeklyObjectives.flatMap(week => week.dailyTasks)
    ).length;

    const completedTasks = plan.monthlyMilestones.flatMap(month =>
      month.weeklyObjectives.flatMap(week => week.dailyTasks.filter(task => task.completed))
    ).length;

    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate monthly progress details
    const monthlyProgress = plan.monthlyMilestones.map((month, monthIndex) => {
      const monthTasks = month.weeklyObjectives.flatMap(week => week.dailyTasks);
      const monthCompleted = monthTasks.filter(task => task.completed).length;
      const monthProgress = monthTasks.length > 0 ? Math.round((monthCompleted / monthTasks.length) * 100) : 0;
      return {
        month: monthIndex + 1,
        milestone: month.milestone,
        progressPercent: monthProgress,
        completedTasks: monthCompleted,
        totalTasks: monthTasks.length
      };
    });

    // Calculate time-based context (use user's timezone if provided)
    const now = new Date();
    const timezone = userTimezone || 'UTC';
    const timeContext = {
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: timezone }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone }),
      hour: (() => {
        try {
          return parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }));
        } catch {
          // Fallback to server time if timezone is invalid
          return now.getHours();
        }
      })(),
      isWeekend: [0, 6].includes(now.getDay()),
      timeOfDay: (() => {
        try {
          const hour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }));
          return hour >= 18 ? 'evening' : hour >= 12 ? 'afternoon' : hour >= 6 ? 'morning' : 'late-night';
        } catch {
          // Fallback to server time if timezone is invalid
          const hour = now.getHours();
          return hour >= 18 ? 'evening' : hour >= 12 ? 'afternoon' : hour >= 6 ? 'morning' : 'late-night';
        }
      })()
    };

    // Calculate insight priorities based on progress and time
    const insightPriorities = {
      needsMotivation: progressPercentage < 25,
      nearingMilestone: progressPercentage >= 75,
      timeBasedFocus: timeContext.isWeekend ? 'reflection' : 'productivity',
      progressStatus: progressPercentage === 0 ? 'just_started' :
                    progressPercentage < 25 ? 'getting_started' :
                    progressPercentage < 50 ? 'building_momentum' :
                    progressPercentage < 75 ? 'making_progress' : 'nearing_completion'
    };

    // Format recent chat activity (better messaging)
    const recentChat = messages.length > 0
      ? messages.slice(-3).map(m => `${m.role}: ${m.content}`).join(' | ')
      : 'fresh_plan';

    const prompt = `You are an expert project coach providing personalized insights. Use these exact calculated metrics to create exactly 2 concise insights:

GOAL: "${plan.goal}"

CURRENT STATUS:
- Total Tasks: ${totalTasks}
- Completed Tasks: ${completedTasks}
- Progress: ${progressPercentage}%
- Current Time: ${timeContext.time} on ${timeContext.dayOfWeek} (${timeContext.timeOfDay})
- Monthly Breakdown: ${monthlyProgress.map(m => `Month ${m.month}: ${m.progressPercent}% complete`).join(' | ')}
- Plan Status: ${insightPriorities.progressStatus.replace('_', ' ')}
- Activity Level: ${recentChat === 'fresh_plan' ? 'New plan just created' : recentChat}

Generate exactly 2 insights in this JSON format:
[{"kind": "progress|milestone|motivation|tip|warning|celebration", "text": "insight message", "score": 1-10}]

Guidelines for Professional Insights:
- Use EXACT calculated numbers and avoid any calculations
- Score 1-10 based on relevance (higher = more urgent/important)
- Keep messages concise, professional, and actionable (1-2 sentences)
- Reference specific progress metrics naturally
- Consider time of day for appropriate advice
- Be encouraging and focus on next steps
- For new plans, focus on getting started and building momentum
- Avoid technical jargon like "early_stage" or "Recent Activity: none"

Examples of good insights:
- "You've completed 15% of your plan - great start! Focus on Month 1 tasks to build momentum."
- "It's morning time - perfect for tackling your first task of the day."
- "With 7 tasks ahead, identify just one to complete today and you'll see immediate progress."

Return only valid JSON array, no extra text or formatting.`;

    try {
      // Get Gemini API key from environment
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY not configured for insights generation");
        return;
      }

      // Import GoogleGenerativeAI dynamically to avoid issues
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();

      // Clean the response - remove markdown code blocks if present
      text = text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse the JSON response
      const generatedInsights: Array<{ kind: string; text: string; score?: number }> = JSON.parse(text.trim());

      // Validate and save insights
      for (const ins of generatedInsights.slice(0, 2)) { // Limit to 2 insights max
        if (ins.kind && ins.text && typeof ins.text === 'string' && ins.text.length > 10) {
          await ctx.runMutation(api.insights.insertInsight, {
            userId,
            planId,
            kind: ins.kind,
            text: ins.text,
            score: ins.score || 5,
            origin: "auto",
          });
        }
      }
    } catch (error) {
      console.error("Failed to generate insights:", error);
      // Don't throw - insights generation should not break plan creation
    }
  },
});
