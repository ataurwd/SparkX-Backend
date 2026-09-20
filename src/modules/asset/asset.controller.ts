import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Asset } from '../../models/Asset';
import { Organization } from '../../models/Organization';

const seedAssets = async (orgId: any) => {
  const count = await Asset.countDocuments({ organizationId: orgId });
  if (count > 0) return;

  const sampleAssets = [
    {
      organizationId: orgId,
      assetTag: 'AST-1001',
      name: 'MacBook Pro M3 Max 16" (64GB, 1TB SSD)',
      category: 'laptop',
      serialNumber: 'C02G41KSMD6T',
      assignedTo: {
        employeeName: 'Sarah Jenkins',
        department: 'Engineering'
      },
      assignedDate: new Date(Date.now() - 90 * 24 * 3600 * 1000),
      purchaseDate: new Date(Date.now() - 100 * 24 * 3600 * 1000),
      purchaseCost: 3499,
      currency: 'USD',
      warrantyExpiry: new Date(Date.now() + 640 * 24 * 3600 * 1000),
      condition: 'good',
      status: 'assigned',
      notes: 'Primary workstation for Lead Backend Engineer.'
    },
    {
      organizationId: orgId,
      assetTag: 'AST-1002',
      name: 'Dell UltraSharp 32" 4K USB-C Hub Monitor (U3223QE)',
      category: 'monitor',
      serialNumber: 'CN-0K7G8-74445',
      assignedTo: {
        employeeName: 'David Chen',
        department: 'Design'
      },
      assignedDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      purchaseDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      purchaseCost: 899,
      currency: 'USD',
      warrantyExpiry: new Date(Date.now() + 500 * 24 * 3600 * 1000),
      condition: 'new',
      status: 'assigned',
      notes: 'Calibrated color gamut for UI/UX product design.'
    },
    {
      organizationId: orgId,
      assetTag: 'AST-1003',
      name: 'MacBook Pro M2 Pro 14" (32GB, 512GB SSD)',
      category: 'laptop',
      serialNumber: 'C02H18PQMD6R',
      purchaseDate: new Date(Date.now() - 180 * 24 * 3600 * 1000),
      purchaseCost: 1999,
      currency: 'USD',
      warrantyExpiry: new Date(Date.now() + 200 * 24 * 3600 * 1000),
      condition: 'good',
      status: 'available',
      notes: 'Returned after team restructuring. Freshly wiped and ready for next hire.'
    },
    {
      organizationId: orgId,
      assetTag: 'AST-1004',
      name: 'Apple iPad Pro 12.9" M2 (Wi-Fi + Cellular 256GB)',
      category: 'mobile',
      serialNumber: 'DLX89230LKL2',
      assignedTo: {
        employeeName: 'Ataur Rahman',
        department: 'Executive / Product'
      },
      assignedDate: new Date(Date.now() - 120 * 24 * 3600 * 1000),
      purchaseDate: new Date(Date.now() - 130 * 24 * 3600 * 1000),
      purchaseCost: 1299,
      currency: 'USD',
      warrantyExpiry: new Date(Date.now() + 230 * 24 * 3600 * 1000),
      condition: 'good',
      status: 'assigned',
      notes: 'Used for mobile app testing and client executive presentations.'
    },
    {
      organizationId: orgId,
      assetTag: 'AST-1005',
      name: 'Dell Precision 5570 Mobile Workstation (i7, RTX A2000)',
      category: 'laptop',
      serialNumber: 'DELL-8821-X99',
      purchaseDate: new Date(Date.now() - 365 * 24 * 3600 * 1000),
      purchaseCost: 2450,
      currency: 'USD',
      condition: 'fair',
      status: 'maintenance',
      notes: 'Sent to Dell Authorized Care for battery thermal replacement.'
    },
    {
      organizationId: orgId,
      assetTag: 'AST-1006',
      name: 'Figma Enterprise Workspace Annual Seat (50 Licenses)',
      category: 'license',
      serialNumber: 'LIC-FIGMA-SPARKX-2026',
      purchaseDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      purchaseCost: 4500,
      currency: 'USD',
      warrantyExpiry: new Date(Date.now() + 335 * 24 * 3600 * 1000),
      condition: 'new',
      status: 'assigned',
      notes: 'Design team collaborative cloud workspace.'
    }
  ];

  await Asset.insertMany(sampleAssets);
};

export const getAssets = async (req: Request, res: Response) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io'
      });
    }

    await seedAssets(org._id);

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
        { assetTag: { $regex: search as string, $options: 'i' } },
        { name: { $regex: search as string, $options: 'i' } },
        { 'assignedTo.employeeName': { $regex: search as string, $options: 'i' } },
        { serialNumber: { $regex: search as string, $options: 'i' } }
      ];
    }

    const assets = await Asset.find(query).sort({ createdAt: -1 });

    const allAssets = await Asset.find({ organizationId: org._id });
    const totalAssets = allAssets.length;
    const assignedCount = allAssets.filter((a) => a.status === 'assigned').length;
    const availableCount = allAssets.filter((a) => a.status === 'available').length;
    const maintenanceCount = allAssets.filter((a) => a.status === 'maintenance').length;
    const totalValueUSD = allAssets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);

    return res.status(200).json({
      success: true,
      data: assets,
      metrics: {
        totalAssets,
        assignedCount,
        availableCount,
        maintenanceCount,
        assignedRate: totalAssets > 0 ? Math.round((assignedCount / totalAssets) * 100) : 0,
        totalValueUSD
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAsset = async (req: Request, res: Response) => {
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
      name,
      category,
      serialNumber,
      purchaseCost,
      condition,
      notes,
      employeeId,
      assignedEmployeeName,
      department
    } = req.body;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const assetTag = `AST-${randomSuffix}`;

    const isAssigned = !!employeeId || !!assignedEmployeeName;

    const asset = await Asset.create({
      organizationId: org._id,
      assetTag,
      name,
      category: category || 'laptop',
      serialNumber: serialNumber || '',
      purchaseCost: Number(purchaseCost) || 0,
      condition: condition || 'good',
      status: isAssigned ? 'assigned' : 'available',
      assignedTo: isAssigned
        ? {
            employeeId: employeeId ? new mongoose.Types.ObjectId(employeeId) : undefined,
            employeeName: assignedEmployeeName || 'Employee',
            department: department || 'Engineering'
          }
        : undefined,
      assignedDate: isAssigned ? new Date() : undefined,
      purchaseDate: new Date(),
      notes: notes || ''
    });

    return res.status(201).json({ success: true, data: asset });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeId, employeeName, department, unassign } = req.body;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (unassign) {
      asset.assignedTo = undefined;
      asset.assignedDate = undefined;
      asset.status = 'available';
    } else {
      asset.assignedTo = {
        employeeId: employeeId ? new mongoose.Types.ObjectId(employeeId) : undefined,
        employeeName: employeeName || 'Employee',
        department: department || 'Operations'
      };
      asset.assignedDate = new Date();
      asset.status = 'assigned';
    }

    await asset.save();
    return res.status(200).json({ success: true, data: asset });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAssetStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, condition, notes } = req.body;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (status) asset.status = status;
    if (condition) asset.condition = condition;
    if (notes !== undefined) asset.notes = notes;

    await asset.save();
    return res.status(200).json({ success: true, data: asset });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
