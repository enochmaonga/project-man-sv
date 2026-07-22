"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ message: 'Name, email and password are required' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters long' });
            return;
        }
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'A user with this email already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = new User_1.User({
            name,
            email,
            password: hashedPassword,
        });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Failed to register user' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const user = await User_1.User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const secret = process.env.JWT_SECRET || 'projectmansecretjwttoken';
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, name: user.name }, secret, { expiresIn: '7d' });
        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Failed to login' });
    }
};
exports.login = login;
