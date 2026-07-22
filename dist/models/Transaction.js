"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const transactionSchema = new mongoose_1.Schema({
    projectId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    type: {
        type: String,
        enum: ['expense', 'income'],
        required: [true, 'Transaction type (expense or income) is required'],
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount must be greater than or equal to 0'],
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now,
    },
}, {
    timestamps: true,
});
exports.Transaction = (0, mongoose_1.model)('Transaction', transactionSchema);
