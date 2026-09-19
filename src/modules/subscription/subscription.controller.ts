import { Request, Response } from 'express';
import { Subscription } from '../../models/Subscription';
import { Employee } from '../../models/Employee';

const PLAN_PRICES: Record<string, number> = {
  starter: 99,
  growth: 299,
  enterprise: 599
};

const PLAN_SEATS: Record<string, number> = {
  starter: 25,
  growth: 100,
  enterprise: 500
};

export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';

    // Count real active employees if any
    let activeEmployeesCount = 0;
    try {
      activeEmployeesCount = await Employee.countDocuments({
        ...(user?.organizationId ? { organizationId: user.organizationId } : {}),
        status: 'active'
      });
    } catch {
      activeEmployeesCount = 382;
    }

    let subscription = await Subscription.findOne({ organizationId });

    if (!subscription) {
      // Seed default active Growth subscription
      subscription = await Subscription.create({
        organizationId,
        plan: 'growth',
        status: 'active',
        seatsTotal: 500,
        seatsAssigned: activeEmployeesCount > 0 ? activeEmployeesCount : 382,
        billingCycle: 'monthly',
        price: 299,
        currency: 'USD',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        invoices: [
          {
            invoiceNumber: 'INV-2026-09',
            date: new Date('2026-09-01'),
            amount: 299,
            currency: 'USD',
            status: 'paid',
            paymentMethod: 'Visa ending 4242'
          },
          {
            invoiceNumber: 'INV-2026-08',
            date: new Date('2026-08-01'),
            amount: 299,
            currency: 'USD',
            status: 'paid',
            paymentMethod: 'Visa ending 4242'
          },
          {
            invoiceNumber: 'INV-2026-07',
            date: new Date('2026-07-01'),
            amount: 299,
            currency: 'USD',
            status: 'paid',
            paymentMethod: 'Visa ending 4242'
          }
        ],
        paymentMethod: {
          brand: 'Visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2028
        }
      });
    } else {
      if (activeEmployeesCount > 0) {
        subscription.seatsAssigned = activeEmployeesCount;
        await subscription.save();
      }
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const upgradeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';
    const { plan, billingCycle = 'monthly' } = req.body;

    if (!['starter', 'growth', 'enterprise'].includes(plan)) {
      res.status(400).json({ success: false, message: 'Invalid subscription tier' });
      return;
    }

    let subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      subscription = new Subscription({ organizationId });
    }

    const basePrice = PLAN_PRICES[plan] || 299;
    const calculatedPrice = billingCycle === 'yearly' ? basePrice * 10 : basePrice;

    subscription.plan = plan;
    subscription.billingCycle = billingCycle;
    subscription.price = calculatedPrice;
    subscription.seatsTotal = Math.max(subscription.seatsTotal, PLAN_SEATS[plan] || 100);
    subscription.status = 'active';

    // Add a new invoice for upgrade
    const newInvoiceNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    subscription.invoices.unshift({
      invoiceNumber: newInvoiceNumber,
      date: new Date(),
      amount: calculatedPrice,
      currency: 'USD',
      status: 'paid',
      paymentMethod: 'Visa ending 4242'
    });

    await subscription.save();

    res.json({
      success: true,
      message: `Successfully updated subscription to ${plan.toUpperCase()}`,
      data: subscription
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addSeats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';
    const { additionalSeats } = req.body;

    const count = parseInt(additionalSeats, 10);
    if (isNaN(count) || count <= 0) {
      res.status(400).json({ success: false, message: 'Invalid additional seats count' });
      return;
    }

    let subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    subscription.seatsTotal += count;
    await subscription.save();

    res.json({
      success: true,
      message: `Successfully added ${count} seats. Total capacity is now ${subscription.seatsTotal}.`,
      data: subscription
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
