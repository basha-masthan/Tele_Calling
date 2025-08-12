const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');

const getMyLeads = async (req, res) => {
  const leads = await Lead.find({ assignedTo: req.user._id });
  res.json(leads);
};

const updateLeadNotes = async (req, res) => {
  const { leadId, notes, followUpDate } = req.body;
  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, assignedTo: req.user._id },
    { $set: { notes, followUpDate } },
    { new: true }
  );
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  res.json(lead);
};

const addCallLog = async (req, res) => {
  const { leadId, status, remarks } = req.body;
  const callLog = new CallLog({
    lead: leadId,
    employee: req.user._id,
    status,
    remarks
  });
  await callLog.save();
  res.json(callLog);
};

const getMyCallLogs = async (req, res) => {
  const logs = await CallLog.find({ employee: req.user._id })
    .populate('lead', 'name phone');
  res.json(logs);
};

module.exports = {
  getMyLeads,
  updateLeadNotes,
  addCallLog,
  getMyCallLogs
};
