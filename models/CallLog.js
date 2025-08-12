const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callStatus: { 
    type: String, 
    enum: ['declined', 'missed', 'not_lifted', 'wrong_number', 'completed'], 
    required: true 
  },
  notes: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', CallLogSchema);
