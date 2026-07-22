import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';
import { Transaction } from '../models/Transaction';

// Helper to verify project ownership
const verifyProjectOwnership = async (projectId: string, ownerId: string): Promise<boolean> => {
  const project = await Project.findOne({ _id: projectId, ownerId });
  return !!project;
};

export const getTransactionsByProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const isOwner = await verifyProjectOwnership(projectId, ownerId);
    if (!isOwner) {
      res.status(403).json({ message: 'Forbidden: Access to this project is denied' });
      return;
    }

    const transactions = await Transaction.find({ projectId }).sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Failed to retrieve transactions' });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, type, category, amount, description, date } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!projectId || !type || !category || amount === undefined) {
      res.status(400).json({ message: 'projectId, type, category, and amount are required' });
      return;
    }

    const isOwner = await verifyProjectOwnership(projectId, ownerId);
    if (!isOwner) {
      res.status(403).json({ message: 'Forbidden: Cannot add transaction to this project' });
      return;
    }

    const transaction = new Transaction({
      projectId,
      type,
      category,
      amount,
      description,
      date: date ? new Date(date) : new Date(),
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Failed to create transaction' });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, category, amount, description, date } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    const isOwner = await verifyProjectOwnership(transaction.projectId.toString(), ownerId);
    if (!isOwner) {
      res.status(403).json({ message: 'Forbidden: Cannot update this transaction' });
      return;
    }

    if (type !== undefined) transaction.type = type;
    if (category !== undefined) transaction.category = category;
    if (amount !== undefined) transaction.amount = amount;
    if (description !== undefined) transaction.description = description;
    if (date !== undefined) transaction.date = new Date(date);

    await transaction.save();
    res.status(200).json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Failed to update transaction' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    const isOwner = await verifyProjectOwnership(transaction.projectId.toString(), ownerId);
    if (!isOwner) {
      res.status(403).json({ message: 'Forbidden: Cannot delete this transaction' });
      return;
    }

    await Transaction.findByIdAndDelete(id);
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
};
