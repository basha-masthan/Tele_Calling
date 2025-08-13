const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    status: { type: String, default: 'New' }, // New, Interested, Hot, Follow-up, Won, Lost
    notes: { type: String },
    recordingUrl: { type: String }, // URL of uploaded audio
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // employee assigned
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // manager/admin who created
    followUpDate: { type: Date }, // Date for follow-up when status is "Follow-up"
    // New fields for manager functionality
    sellingPrice: { type: Number }, // Price when lead is won
    lossReason: { type: String }, // Reason when lead is lost
    reassignmentDate: { type: Date }, // Date when lead should be reassigned (for lost leads)
    previousAssignments: [{ 
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedAt: { type: Date, default: Date.now },
        status: { type: String }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
