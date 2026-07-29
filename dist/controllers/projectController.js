"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCollaborator = exports.shareProject = exports.deleteProject = exports.updateProject = exports.createProject = exports.getProject = exports.getProjects = void 0;
const Project_1 = require("../models/Project");
const Transaction_1 = require("../models/Transaction");
const User_1 = require("../models/User");
const getProjects = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const projects = await Project_1.Project.find({
            $or: [{ ownerId: userId }, { collaborators: userId }],
        })
            .populate('ownerId', 'name email')
            .populate('collaborators', 'name email')
            .sort({ createdAt: -1 });
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
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const project = await Project_1.Project.findOne({
            _id: id,
            $or: [{ ownerId: userId }, { collaborators: userId }],
        })
            .populate('ownerId', 'name email')
            .populate('collaborators', 'name email');
        if (!project) {
            res.status(404).json({ message: 'Project not found or access denied' });
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
        const { name, description, category } = req.body;
        const ownerId = req.user?.id;
        if (!name) {
            res.status(400).json({ message: 'Project name is required' });
            return;
        }
        const project = new Project_1.Project({
            name,
            description,
            category: category || 'general',
            ownerId,
            collaborators: [],
        });
        await project.save();
        await project.populate('ownerId', 'name email');
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
        const { name, description, status, category } = req.body;
        const userId = req.user?.id;
        const project = await Project_1.Project.findOne({
            _id: id,
            $or: [{ ownerId: userId }, { collaborators: userId }],
        });
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
        if (category !== undefined)
            project.category = category;
        await project.save();
        await project.populate('ownerId', 'name email');
        await project.populate('collaborators', 'name email');
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
        // Only owner can delete project
        const project = await Project_1.Project.findOneAndDelete({ _id: id, ownerId });
        if (!project) {
            res.status(404).json({ message: 'Project not found or unauthorized (only owner can delete)' });
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
const shareProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;
        const userId = req.user?.id;
        if (!email) {
            res.status(400).json({ message: 'Email address is required to share project' });
            return;
        }
        const project = await Project_1.Project.findOne({
            _id: id,
            $or: [{ ownerId: userId }, { collaborators: userId }],
        });
        if (!project) {
            res.status(404).json({ message: 'Project not found or access denied' });
            return;
        }
        const targetUser = await User_1.User.findOne({ email: email.toLowerCase().trim() });
        if (!targetUser) {
            res.status(404).json({ message: `No registered user found with email "${email}". Ask them to sign up first.` });
            return;
        }
        // Check if target user is owner
        if (project.ownerId.toString() === targetUser._id.toString()) {
            res.status(400).json({ message: 'This user is already the owner of this project.' });
            return;
        }
        // Check if target user is already a collaborator
        const isAlreadyCollab = project.collaborators.some((collabId) => collabId.toString() === targetUser._id.toString());
        if (isAlreadyCollab) {
            res.status(400).json({ message: 'User is already a collaborator on this project.' });
            return;
        }
        project.collaborators.push(targetUser._id);
        await project.save();
        await project.populate('ownerId', 'name email');
        await project.populate('collaborators', 'name email');
        res.status(200).json({
            message: `Project successfully shared with ${targetUser.name} (${targetUser.email})`,
            project,
        });
    }
    catch (error) {
        console.error('Share project error:', error);
        res.status(500).json({ message: 'Failed to share project' });
    }
};
exports.shareProject = shareProject;
const removeCollaborator = async (req, res) => {
    try {
        const { id, collaboratorId } = req.params;
        const userId = req.user?.id;
        const project = await Project_1.Project.findOne({
            _id: id,
            $or: [{ ownerId: userId }, { collaborators: userId }],
        });
        if (!project) {
            res.status(404).json({ message: 'Project not found or access denied' });
            return;
        }
        // Remove collaborator
        project.collaborators = project.collaborators.filter((cId) => cId.toString() !== collaboratorId);
        await project.save();
        await project.populate('ownerId', 'name email');
        await project.populate('collaborators', 'name email');
        res.status(200).json({
            message: 'Collaborator removed successfully',
            project,
        });
    }
    catch (error) {
        console.error('Remove collaborator error:', error);
        res.status(500).json({ message: 'Failed to remove collaborator' });
    }
};
exports.removeCollaborator = removeCollaborator;
