// controllers/employeeController.js
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');

// GET /api/employee/leads
// returns the leads assigned to the logged-in employee
exports.getMyLeads = async (req, res) => {
  try {
    // req.user is the full user doc from auth middleware
    const userId = req.user._id;
    const leads = await Lead.find({ assignedTo: userId })
      .select('name email phone status notes followUpDate createdAt createdBy')
      .populate('createdBy', 'name email');

    res.json(leads);
  } catch (err) {
    console.error('getMyLeads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads', details: err.message });
  }
};

// PUT /api/employee/update-lead
// body: { leadId, note, status, followUpDate }
// only allowed if lead.assignedTo === req.user._id
exports.updateLeadNotes = async (req, res) => {
  try {
    const { leadId, note, status, followUpDate } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId required' });

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // ensure this lead is assigned to this employee
    if (!lead.assignedTo || String(lead.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to update this lead' });
    }

    // push a note if provided
    if (note) {
      if (!lead.notes) lead.notes = [];
      lead.notes.push({ note, addedBy: req.user._id });
    }

    if (status) lead.status = status;
    if (followUpDate) lead.followUpDate = new Date(followUpDate);

    await lead.save();
    // Return the updated lead (selecting important fields)
    const updated = await Lead.findById(leadId).select('name phone email status notes followUpDate createdAt').populate('createdBy', 'name');
    res.json({ message: 'Lead updated', lead: updated });
  } catch (err) {
    console.error('updateLeadNotes error:', err);
    res.status(500).json({ error: 'Failed to update lead', details: err.message });
  }
};

// POST /api/employee/call-log
// body: { leadId, callStatus, notes }
exports.addCallLog = async (req, res) => {
  try {
    const { leadId, callStatus, notes } = req.body;
    if (!leadId || !callStatus) return res.status(400).json({ error: 'leadId and callStatus required' });

    // ensure lead exists and is assigned to this employee
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.assignedTo || String(lead.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to log call for this lead' });
    }

    const log = await CallLog.create({
      lead: leadId,
      employee: req.user._id,
      callStatus,
      notes,
      uploadedBy: req.user._id
    });

    res.status(201).json({ message: 'Call log saved', log });
  } catch (err) {
    console.error('addCallLog error:', err);
    res.status(500).json({ error: 'Failed to save call log', details: err.message });
  }
};

// GET /api/employee/my-call-logs
exports.getMyCallLogs = async (req, res) => {
  try {
    const logs = await CallLog.find({ employee: req.user._id })
      .populate('lead', 'name phone email')
      .select('lead callStatus notes createdAt');

    res.json(logs);
  } catch (err) {
    console.error('getMyCallLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch call logs', details: err.message });
  }
};
