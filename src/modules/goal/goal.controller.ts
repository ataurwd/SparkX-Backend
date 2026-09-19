import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Goal, IKeyResult } from '../../models/Goal';

// Helper to recalculate goal progress from key results
const recalculateGoalProgress = (goal: any): number => {
  if (!goal.keyResults || goal.keyResults.length === 0) {
    return goal.progress || 0;
  }
  const total = goal.keyResults.reduce((acc: number, kr: IKeyResult) => acc + (kr.progress || 0), 0);
  const avg = Math.round(total / goal.keyResults.length);
  return Math.min(100, Math.max(0, avg));
};

export const getGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { category, period, departmentId, ownerId, status, search } = req.query;

    const filter: any = { organizationId: orgId };
    if (category && category !== 'all') filter.category = category;
    if (period && period !== 'all') filter.period = period;
    if (departmentId && departmentId !== 'all') filter.departmentId = departmentId;
    if (ownerId && ownerId !== 'all') filter.ownerId = ownerId;
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const goals = await Goal.find(filter)
      .populate('departmentId', 'name color')
      .populate('ownerId', 'firstName lastName employeeCode avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: goals });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGoalSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { period } = req.query;

    const filter: any = { organizationId: orgId };
    if (period && period !== 'all') filter.period = period;

    const goals = await Goal.find(filter);

    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const inProgressGoals = goals.filter((g) => g.status === 'in_progress').length;

    const totalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    const avgProgress = totalGoals > 0 ? Math.round(totalProgress / totalGoals) : 0;

    let onTrackCount = 0;
    let needsAttentionCount = 0;
    let atRiskCount = 0;

    goals.forEach((g) => {
      g.keyResults.forEach((kr) => {
        if (kr.confidenceLevel === 'on_track') onTrackCount++;
        else if (kr.confidenceLevel === 'needs_attention') needsAttentionCount++;
        else if (kr.confidenceLevel === 'at_risk') atRiskCount++;
      });
    });

    res.status(200).json({
      success: true,
      data: {
        totalGoals,
        completedGoals,
        inProgressGoals,
        avgProgress,
        onTrackCount,
        needsAttentionCount,
        atRiskCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGoalById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const goal = await Goal.findOne({ _id: id, organizationId: orgId })
      .populate('departmentId', 'name color')
      .populate('ownerId', 'firstName lastName employeeCode avatarUrl');

    if (!goal) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    res.status(200).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const {
      title,
      description,
      category,
      departmentId,
      ownerId,
      period,
      startDate,
      endDate,
      weight,
      keyResults,
      tags
    } = req.body;

    if (!title || !period || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Title, period, and dates are required' });
      return;
    }

    // Process key results if provided
    const processedKRs = (keyResults || []).map((kr: any) => {
      const initial = Number(kr.initialValue) || 0;
      const target = Number(kr.targetValue) || 100;
      const current = Number(kr.currentValue) || initial;
      const range = target - initial;
      const progress = range !== 0 ? Math.min(100, Math.max(0, Math.round(((current - initial) / range) * 100))) : 0;

      return {
        title: kr.title,
        metricType: kr.metricType || 'percentage',
        initialValue: initial,
        targetValue: target,
        currentValue: current,
        unit: kr.unit || '%',
        confidenceLevel: kr.confidenceLevel || 'on_track',
        progress
      };
    });

    const goal = new Goal({
      organizationId: orgId,
      title,
      description: description || '',
      category: category || 'company',
      departmentId: departmentId || undefined,
      ownerId: ownerId || undefined,
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      weight: Number(weight) || 1,
      keyResults: processedKRs,
      tags: tags || []
    });

    goal.progress = recalculateGoalProgress(goal);
    if (goal.progress >= 100) goal.status = 'completed';

    await goal.save();
    res.status(201).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const goal = await Goal.findOne({ _id: id, organizationId: orgId });
    if (!goal) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    const { title, description, category, departmentId, ownerId, period, status, weight, tags } = req.body;
    if (title) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (category) goal.category = category;
    if (departmentId !== undefined) goal.departmentId = departmentId;
    if (ownerId !== undefined) goal.ownerId = ownerId;
    if (period) goal.period = period;
    if (status) goal.status = status;
    if (weight !== undefined) goal.weight = Number(weight);
    if (tags) goal.tags = tags;

    await goal.save();
    res.status(200).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateKeyResult = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id, krId } = req.params;
    const { currentValue, confidenceLevel, title, targetValue } = req.body;

    const goal = await Goal.findOne({ _id: id, organizationId: orgId });
    if (!goal) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    const kr = (goal.keyResults as any[]).find((k: any) => k._id?.toString() === krId);
    if (!kr) {
      res.status(404).json({ success: false, message: 'Key result not found' });
      return;
    }

    if (title) kr.title = title;
    if (targetValue !== undefined) kr.targetValue = Number(targetValue);
    if (currentValue !== undefined) kr.currentValue = Number(currentValue);
    if (confidenceLevel) kr.confidenceLevel = confidenceLevel;

    // Recalculate KR progress
    const range = kr.targetValue - kr.initialValue;
    kr.progress = range !== 0 ? Math.min(100, Math.max(0, Math.round(((kr.currentValue - kr.initialValue) / range) * 100))) : 0;
    kr.updatedAt = new Date();

    // Recalculate parent goal progress
    goal.progress = recalculateGoalProgress(goal);
    if (goal.progress >= 100) {
      goal.status = 'completed';
    } else if (goal.status === 'completed' && goal.progress < 100) {
      goal.status = 'in_progress';
    }

    await goal.save();
    res.status(200).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addKeyResult = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;
    const { title, metricType, initialValue, targetValue, currentValue, unit, confidenceLevel } = req.body;

    const goal = await Goal.findOne({ _id: id, organizationId: orgId });
    if (!goal) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    const initial = Number(initialValue) || 0;
    const target = Number(targetValue) || 100;
    const current = Number(currentValue) || initial;
    const range = target - initial;
    const progress = range !== 0 ? Math.min(100, Math.max(0, Math.round(((current - initial) / range) * 100))) : 0;

    goal.keyResults.push({
      title,
      metricType: metricType || 'percentage',
      initialValue: initial,
      targetValue: target,
      currentValue: current,
      unit: unit || '%',
      confidenceLevel: confidenceLevel || 'on_track',
      progress,
      updatedAt: new Date()
    });

    goal.progress = recalculateGoalProgress(goal);
    await goal.save();

    res.status(201).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const goal = await Goal.findOneAndDelete({ _id: id, organizationId: orgId });
    if (!goal) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Goal deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
