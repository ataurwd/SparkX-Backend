import { Router } from 'express';
import { getExpenses, createExpense, updateExpenseStatus } from './expense.controller';

const router = Router();

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id/status', updateExpenseStatus);

export default router;
