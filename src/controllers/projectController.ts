import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const projects = await Project.find({
      $or: [{ ownerId: userId }, { collaborators: userId }],
    })
      .populate('ownerId', 'name email')
      .populate('collaborators', 'name email')
      .sort({ createdAt: -1 });

    // Enriched projects with sum of income and expenses
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const transactions = await Transaction.find({ projectId: project._id });
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
      })
    );

    res.status(200).json(enrichedProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to retrieve projects' });
  }
};

export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const project = await Project.findOne({
      _id: id,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    })
      .populate('ownerId', 'name email')
      .populate('collaborators', 'name email');

    if (!project) {
      res.status(404).json({ message: 'Project not found or access denied' });
      return;
    }

    const transactions = await Transaction.find({ projectId: id }).sort({ date: -1 });
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
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to retrieve project details' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category } = req.body;
    const ownerId = req.user?.id;

    if (!name) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    const project = new Project({
      name,
      description,
      category: category || 'general',
      ownerId,
      collaborators: [],
    });

    await project.save();
    await project.populate('ownerId', 'name email');
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, status, category, customExpenseCategories, customIncomeCategories } = req.body;
    const userId = req.user?.id;

    const project = await Project.findOne({
      _id: id,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found or unauthorized' });
      return;
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (category !== undefined) project.category = category;
    if (customExpenseCategories !== undefined) (project as any).customExpenseCategories = customExpenseCategories;
    if (customIncomeCategories !== undefined) (project as any).customIncomeCategories = customIncomeCategories;

    await project.save();
    await project.populate('ownerId', 'name email');
    await project.populate('collaborators', 'name email');

    res.status(200).json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

export const addCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, category } = req.body;
    const userId = req.user?.id;

    if (!category || !category.trim()) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }
    if (!type || (type !== 'expense' && type !== 'income')) {
      res.status(400).json({ message: 'Type must be either expense or income' });
      return;
    }

    const project = await Project.findOne({
      _id: id,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found or unauthorized' });
      return;
    }

    const cleanCategory = category.trim();
    if (type === 'expense') {
      if (!(project as any).customExpenseCategories) (project as any).customExpenseCategories = [];
      if (!(project as any).customExpenseCategories.includes(cleanCategory)) {
        (project as any).customExpenseCategories.push(cleanCategory);
      }
    } else {
      if (!(project as any).customIncomeCategories) (project as any).customIncomeCategories = [];
      if (!(project as any).customIncomeCategories.includes(cleanCategory)) {
        (project as any).customIncomeCategories.push(cleanCategory);
      }
    }

    await project.save();
    await project.populate('ownerId', 'name email');
    await project.populate('collaborators', 'name email');

    res.status(200).json(project);
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({ message: 'Failed to add category' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.id;

    // Only owner can delete project
    const project = await Project.findOneAndDelete({ _id: id, ownerId });
    if (!project) {
      res.status(404).json({ message: 'Project not found or unauthorized (only owner can delete)' });
      return;
    }

    // Delete all transactions associated with this project
    await Transaction.deleteMany({ projectId: id });

    res.status(200).json({ message: 'Project and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

export const shareProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const userId = req.user?.id;

    if (!email) {
      res.status(400).json({ message: 'Email address is required to share project' });
      return;
    }

    const project = await Project.findOne({
      _id: id,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found or access denied' });
      return;
    }

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
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
    const isAlreadyCollab = project.collaborators.some(
      (collabId) => collabId.toString() === targetUser._id.toString()
    );

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
  } catch (error) {
    console.error('Share project error:', error);
    res.status(500).json({ message: 'Failed to share project' });
  }
};

export const removeCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, collaboratorId } = req.params;
    const userId = req.user?.id;

    const project = await Project.findOne({
      _id: id,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found or access denied' });
      return;
    }

    // Remove collaborator
    project.collaborators = project.collaborators.filter(
      (cId) => cId.toString() !== collaboratorId
    );

    await project.save();
    await project.populate('ownerId', 'name email');
    await project.populate('collaborators', 'name email');

    res.status(200).json({
      message: 'Collaborator removed successfully',
      project,
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ message: 'Failed to remove collaborator' });
  }
};
