// src/app/services/convexPlanService.ts
import { api } from '@milestoneAI-next-js/backend/convex/_generated/api';
import type { Id } from '@milestoneAI-next-js/backend/convex/_generated/dataModel';
import type { FullPlan } from '../types/planTypes';
import { ConvexReactClient } from 'convex/react';

/**
 * @description
 * Client helper wrapping Convex mutations/queries for plan CRUD operations.
 *
 * @receives data from:
 * - contexts/PlanContext.tsx; saveCurrentPlan: Provides current `FullPlan` to persist
 * - components/modals/SavedPlansModal.tsx; fetch & delete operations for saved plans
 *
 * @sends data to:
 * - Convex backend; plans.ts: Calls `savePlan`, `listPlans`, `deletePlan`, `deletePlansByGoal`
 *
 * @sideEffects:
 * - Performs network calls to Convex to create/read/delete plan documents
 */
export class ConvexPlanService {
  private client: ConvexReactClient;

  constructor(client: ConvexReactClient) {
    this.client = client;
  }

  async savePlan(userId: string, plan: FullPlan): Promise<string> {
    const id = await this.client.mutation(api.plans.savePlan, { userId, plan });
    return id as unknown as string;
  }

  async listPlans(userId: string): Promise<(FullPlan & { _id: Id<'plans'>; createdAt: number })[]> {
    const docs = await this.client.query(api.plans.listPlans, { userId });
    return docs as unknown as (FullPlan & { _id: Id<'plans'>; createdAt: number })[];
  }

  async deletePlan(userId: string, id: Id<'plans'>): Promise<void> {
    await this.client.mutation(api.plans.deletePlan, { userId, id });
  }

  async deletePlansByGoal(userId: string, goal: string): Promise<number> {
    const result = await this.client.mutation(api.plans.deletePlansByGoal, { userId, goal });
    return (result as { deleted: number }).deleted;
  }
}


