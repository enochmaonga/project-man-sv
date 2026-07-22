"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.updateProject = exports.createProject = exports.getProject = exports.getProjects = void 0;
const Project_1 = require("../models/Project");
const Transaction_1 = require("../models/Transaction");
const getProjects = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const projects = await Project_1.Project.find({ ownerId }).sort({ createdAt: -1 });
        // Enriched projects with sum of income and expenses
        const enrichedProjects = await Promise.all(projects.map(async (project) => {
            const transactions = await Transaction_1.Transaction.find({ projectId: project._id });
            const expenses = transactions
                .filter((t) => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const income = transactions
                .filter((t) => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            return {
                ...project.toObject(),
                expenses,
                income,
                netProfit: income - expenses,
            };
        }));
        res.status(200).json(enrichedProjects);
    }
    catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Failed to retrieve projects' });
    }
};
exports.getProjects = getProjects;
const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user?.id;
        const project = await Project_1.Project.findOne({ _id: id, ownerId });
        if (!project) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        const transactions = await Transaction_1.Transaction.find({ projectId: id }).sort({ date: -1 });
        const expenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const income = transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        res.status(200).json({
            project,
            summary: {
                expenses,
                income,
                netProfit: income - expenses,
            },
        });
    }
    catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Failed to retrieve project details' });
    }
};
exports.getProject = getProject;
const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const ownerId = req.user?.id;
        if (!name) {
            res.status(400).json({ message: 'Project name is required' });
            return;
        }
        const project = new Project_1.Project({
            name,
            description,
            ownerId,
        });
        await project.save();
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Failed to create project' });
    }
};
exports.createProject = createProject;
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;
        const ownerId = req.user?.id;
        const project = await Project_1.Project.findOne({ _id: id, ownerId });
        if (!project) {
            res.status(404).json({ message: 'Project not found or unauthorized' });
            return;
        }
        if (name !== undefined)
            project.name = name;
        if (description !== undefined)
            project.description = description;
        if (status !== undefined)
            project.status = status;
        await project.save();
        res.status(200).json(project);
    }
    catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ message: 'Failed to update project' });
    }
};
exports.updateProject = updateProject;
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user?.id;
        const project = await Project_1.Project.findOneAndDelete({ _id: id, ownerId });
        if (!project) {
            res.status(404).json({ message: 'Project not found or unauthorized' });
            return;
        }
        // Delete all transactions associated with this project
        await Transaction_1.Transaction.deleteMany({ projectId: id });
        res.status(200).json({ message: 'Project and all associated data deleted successfully' });
    }
    catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: 'Failed to delete project' });
    }
};
exports.deleteProject = deleteProject;
