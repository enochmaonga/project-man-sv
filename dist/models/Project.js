"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = require("mongoose");
const projectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active',
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
exports.Project = (0, mongoose_1.model)('Project', projectSchema);
