"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.getTransactionsByProject = void 0;
const Project_1 = require("../models/Project");
const Transaction_1 = require("../models/Transaction");
// Helper to verify user access to project (as owner or collaborator)
const verifyProjectAccess = async (projectId, userId) => {
    const project = await Project_1.Project.findOne({
        _id: projectId,
        $or: [{ ownerId: userId }, { collaborators: userId }],
    });
    return !!project;
};
const getTransactionsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const hasAccess = await verifyProjectAccess(projectId, userId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Forbidden: Access to this project is denied' });
            return;
        }
        const transactions = await Transaction_1.Transaction.find({ projectId }).sort({ date: -1 });
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ message: 'Failed to retrieve transactions' });
    }
};
exports.getTransactionsByProject = getTransactionsByProject;
const createTransaction = async (req, res) => {
    try {
        const { projectId, type, category, amount, description, date } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!projectId || !type || !category || amount === undefined) {
            res.status(400).json({ message: 'projectId, type, category, and amount are required' });
            return;
        }
        const hasAccess = await verifyProjectAccess(projectId, userId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Forbidden: Cannot add transaction to this project' });
            return;
        }
        const transaction = new Transaction_1.Transaction({
            projectId,
            type,
            category,
            amount,
            description,
            date: date ? new Date(date) : new Date(),
        });
        await transaction.save();
        res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ message: 'Failed to create transaction' });
    }
};
exports.createTransaction = createTransaction;
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, category, amount, description, date } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const transaction = await Transaction_1.Transaction.findById(id);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }
        const hasAccess = await verifyProjectAccess(transaction.projectId.toString(), userId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Forbidden: Cannot update this transaction' });
            return;
        }
        if (type !== undefined)
            transaction.type = type;
        if (category !== undefined)
            transaction.category = category;
        if (amount !== undefined)
            transaction.amount = amount;
        if (description !== undefined)
            transaction.description = description;
        if (date !== undefined)
            transaction.date = new Date(date);
        await transaction.save();
        res.status(200).json(transaction);
    }
    catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ message: 'Failed to update transaction' });
    }
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const transaction = await Transaction_1.Transaction.findById(id);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }
        const hasAccess = await verifyProjectAccess(transaction.projectId.toString(), userId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Forbidden: Cannot delete this transaction' });
            return;
        }
        await Transaction_1.Transaction.findByIdAndDelete(id);
        res.status(200).json({ message: 'Transaction deleted successfully' });
    }
    catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ message: 'Failed to delete transaction' });
    }
};
exports.deleteTransaction = deleteTransaction;
