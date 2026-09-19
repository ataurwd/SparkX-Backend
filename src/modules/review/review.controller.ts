import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ReviewCycle } from '../../models/ReviewCycle';
import { PerformanceReview } from '../../models/PerformanceReview';
import { Employee } from '../../models/Employee';

export const getReviewCycles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const cycles = await ReviewCycle.find({ organizationId: orgId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: cycles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReviewCycle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { title, period, cycleType, startDate, endDate } = req.body;

    if (!title || !period || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Title, period, and cycle dates are required' });
      return;
    }

    const cycle = new ReviewCycle({
      organizationId: orgId,
      title,
      period,
      cycleType: cycleType || 'quarterly',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'active'
    });

    await cycle.save();

    // Find all active employees to auto-generate review forms
    const employees = await Employee.find({
      organizationId: orgId,
      employmentStatus: { $in: ['active', 'probation'] }
    });

    let count = 0;
    for (const emp of employees) {
      const exists = await PerformanceReview.findOne({
        organizationId: orgId,
        cycleId: cycle._id,
        employeeId: emp._id
      });

      if (!exists) {
        await PerformanceReview.create({
          organizationId: orgId,
          cycleId: cycle._id,
          employeeId: emp._id,
          reviewerId: emp.managerId || undefined,
          status: 'self_review'
        });
        count++;
      }
    }

    cycle.totalReviews = count;
    await cycle.save();

    res.status(201).json({ success: true, data: cycle, message: `Review cycle launched with ${count} evaluations` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { cycleId, status, employeeId, reviewerId } = req.query;

    const filter: any = { organizationId: orgId };
    if (cycleId && cycleId !== 'all') filter.cycleId = cycleId;
    if (status && status !== 'all') filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    if (reviewerId) filter.reviewerId = reviewerId;

    const reviews = await PerformanceReview.find(filter)
      .populate('cycleId', 'title period cycleType')
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode avatarUrl departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'title' }
        ]
      })
      .populate('reviewerId', 'firstName lastName employeeCode avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;

    const employee = await Employee.findOne({ organizationId: orgId, userId });
    const empId = employee?._id;

    // 1. My personal reviews
    const myAppraisals = empId
      ? await PerformanceReview.find({ organizationId: orgId, employeeId: empId })
          .populate('cycleId', 'title period status endDate')
          .populate('reviewerId', 'firstName lastName avatarUrl')
          .sort({ createdAt: -1 })
      : [];

    // 2. Reviews I need to evaluate as manager
    const managerReviews = empId
      ? await PerformanceReview.find({ organizationId: orgId, reviewerId: empId })
          .populate('cycleId', 'title period status endDate')
          .populate({
            path: 'employeeId',
            select: 'firstName lastName employeeCode avatarUrl departmentId designationId',
            populate: [
              { path: 'departmentId', select: 'name' },
              { path: 'designationId', select: 'title' }
            ]
          })
          .sort({ createdAt: -1 })
      : [];

    res.status(200).json({
      success: true,
      data: {
        myAppraisals,
        managerReviews
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviewById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const review = await PerformanceReview.findOne({ _id: id, organizationId: orgId })
      .populate('cycleId', 'title period cycleType startDate endDate status')
      .populate({
        path: 'employeeId',
        select: 'firstName lastName employeeCode avatarUrl departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'title' }
        ]
      })
      .populate('reviewerId', 'firstName lastName employeeCode avatarUrl');

    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    res.status(200).json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitSelfAssessment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;
    const { accomplishments, challenges, goalsProgressSummary, rating } = req.body;

    const review = await PerformanceReview.findOne({ _id: id, organizationId: orgId });
    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    review.selfAssessment = {
      accomplishments: accomplishments || '',
      challenges: challenges || '',
      goalsProgressSummary: goalsProgressSummary || '',
      rating: Math.min(5, Math.max(1, Number(rating) || 3)),
      submittedAt: new Date()
    };

    review.status = 'manager_review';
    await review.save();

    res.status(200).json({ success: true, data: review, message: 'Self-appraisal submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitManagerAssessment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;
    const {
      strengths,
      growthAreas,
      feedback,
      leadershipRating,
      executionRating,
      cultureRating,
      overallRating,
      promotionRecommendation,
      salaryIncrementRecommendation
    } = req.body;

    const review = await PerformanceReview.findOne({ _id: id, organizationId: orgId });
    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    const lRating = Math.min(5, Math.max(1, Number(leadershipRating) || 3));
    const eRating = Math.min(5, Math.max(1, Number(executionRating) || 3));
    const cRating = Math.min(5, Math.max(1, Number(cultureRating) || 3));
    const oRating = Math.min(5, Math.max(1, Number(overallRating) || 3));
    const sRating = review.selfAssessment?.rating || 3;

    review.managerAssessment = {
      strengths: strengths || '',
      growthAreas: growthAreas || '',
      feedback: feedback || '',
      leadershipRating: lRating,
      executionRating: eRating,
      cultureRating: cRating,
      overallRating: oRating,
      promotionRecommendation: promotionRecommendation || 'not_ready',
      salaryIncrementRecommendation: Number(salaryIncrementRecommendation) || 0,
      submittedAt: new Date()
    };

    // Calculate final weighted score
    // 20% Self + 30% Leadership + 30% Execution + 20% Culture
    const rawScore = 0.2 * sRating + 0.3 * lRating + 0.3 * eRating + 0.2 * cRating;
    const finalScore = Math.round(rawScore * 10) / 10;
    review.finalScore = finalScore;

    // Determine performance band
    if (finalScore >= 4.5) review.performanceBand = 'exceptional';
    else if (finalScore >= 3.8) review.performanceBand = 'exceeds_expectations';
    else if (finalScore >= 2.8) review.performanceBand = 'meets_expectations';
    else review.performanceBand = 'needs_improvement';

    review.status = 'completed';
    await review.save();

    // Update parent cycle completedReviews count
    const completedCount = await PerformanceReview.countDocuments({
      organizationId: orgId,
      cycleId: review.cycleId,
      status: 'completed'
    });

    await ReviewCycle.findByIdAndUpdate(review.cycleId, { completedReviews: completedCount });

    res.status(200).json({ success: true, data: review, message: 'Manager evaluation recorded successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgeReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const review = await PerformanceReview.findOne({ _id: id, organizationId: orgId });
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }

    review.acknowledgedAt = new Date();
    await review.save();

    res.status(200).json({ success: true, data: review, message: 'Review acknowledged' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
