import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ExpenseClaim } from '../../models/ExpenseClaim';
import { Organization } from '../../models/Organization';
import { Employee } from '../../models/Employee';

// Sample seeds for realistic demo
const seedExpenses = async (orgId: any) => {
  const count = await ExpenseClaim.countDocuments({ organizationId: orgId });
  if (count > 0) return;

  const dummyEmpId = new mongoose.Types.ObjectId();
  const sampleClaims = [
    {
      organizationId: orgId,
      employeeId: dummyEmpId,
      employeeName: 'Sarah Jenkins',
      employeeEmail: 'sarah.j@sparkx.io',
      department: 'Engineering',
      title: 'AWS Cloud Architecture Certification Exam',
      category: 'software',
      amount: 32000,
      currency: 'BDT',
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      status: 'pending',
      expenseDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      submittedDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      notes: 'Approved during annual learning budget allocation.'
    },
    {
      organizationId: orgId,
      employeeId: dummyEmpId,
      employeeName: 'David Chen',
      employeeEmail: 'david.c@sparkx.io',
      department: 'Design',
      title: 'Dual Ergonomic Monitor Arms (Workstation Upgrade)',
      category: 'hardware',
      amount: 14500,
      currency: 'BDT',
      receiptUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600',
      status: 'approved',
      expenseDate: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      submittedDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      reviewedBy: 'Alex Morgan (HR)',
      reviewedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      notes: 'Receipt verified from Star Tech.'
    },
    {
      organizationId: orgId,
      employeeId: dummyEmpId,
      employeeName: 'Michael Scott',
      employeeEmail: 'michael.s@sparkx.io',
      department: 'Sales',
      title: 'Enterprise Client Dinner & Strategy Alignment',
      category: 'meals',
      amount: 28500,
      currency: 'BDT',
      receiptUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
      status: 'reimbursed',
      expenseDate: new Date(Date.now() - 12 * 24 * 3600 * 1000),
      submittedDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      reviewedBy: 'Finance Desk',
      reviewedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
      notes: 'Wire transfer processed with September batch.'
    },
    {
      organizationId: orgId,
      employeeId: dummyEmpId,
      employeeName: 'Emily Watson',
      employeeEmail: 'emily.w@sparkx.io',
      department: 'Marketing',
      title: 'Airport Taxi & Transit during Q3 Tech Expo',
      category: 'travel',
      amount: 6500,
      currency: 'BDT',
      receiptUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600',
      status: 'rejected',
      expenseDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
      submittedDate: new Date(Date.now() - 14 * 24 * 3600 * 1000),
      reviewedBy: 'Finance Desk',
      reviewedAt: new Date(Date.now() - 13 * 24 * 3600 * 1000),
      rejectionReason: 'Missing official Uber corporate business tax invoice.'
    }
  ];

  await ExpenseClaim.insertMany(sampleClaims);
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io'
      });
    }

    await seedExpenses(org._id);

    const { status, category, search } = req.query;
    const query: any = { organizationId: org._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { employeeName: { $regex: search as string, $options: 'i' } },
        { department: { $regex: search as string, $options: 'i' } }
      ];
    }

    const claims = await ExpenseClaim.find(query).sort({ createdAt: -1 });

    // Aggregate metrics
    const allClaims = await ExpenseClaim.find({ organizationId: org._id });
    const pendingAmount = allClaims
      .filter((c) => c.status === 'pending')
      .reduce((acc, c) => acc + c.amount, 0);
    const approvedAmount = allClaims
      .filter((c) => c.status === 'approved')
      .reduce((acc, c) => acc + c.amount, 0);
    const reimbursedAmount = allClaims
      .filter((c) => c.status === 'reimbursed')
      .reduce((acc, c) => acc + c.amount, 0);

    return res.status(200).json({
      success: true,
      data: claims,
      metrics: {
        totalClaims: allClaims.length,
        pendingCount: allClaims.filter((c) => c.status === 'pending').length,
        pendingAmount,
        approvedAmount,
        reimbursedAmount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io'
      });
    }

    const {
      title,
      category,
      amount,
      currency,
      receiptUrl,
      employeeName,
      employeeEmail,
      department,
      notes
    } = req.body;

    const claim = await ExpenseClaim.create({
      organizationId: org._id,
      employeeId: new mongoose.Types.ObjectId(),
      employeeName: employeeName || 'Ataur Rahman',
      employeeEmail: employeeEmail || 'ataur@sparkx.io',
      department: department || 'Engineering',
      title,
      category: category || 'travel',
      amount: Number(amount) || 0,
      currency: currency || 'BDT',
      receiptUrl: receiptUrl || '',
      status: 'pending',
      notes: notes || ''
    });

    return res.status(201).json({ success: true, data: claim });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpenseStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy, rejectionReason } = req.body;

    const claim = await ExpenseClaim.findById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    claim.status = status;
    claim.reviewedBy = reviewedBy || 'Operations Admin';
    claim.reviewedAt = new Date();
    if (rejectionReason) {
      claim.rejectionReason = rejectionReason;
    }

    await claim.save();

    return res.status(200).json({ success: true, data: claim });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
