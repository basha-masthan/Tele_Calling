const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    status: { type: String, default: 'New' }, // New, Follow-up, Converted, Lost
    notes: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // employee assigned
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // manager/admin who created
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
