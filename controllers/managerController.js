// controllers/managerController.js
const User = require('../models/User');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const mongoose = require('mongoose');

exports.getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee', manager: req.user._id }, '_id name email createdAt');
    res.json(employees);
  } catch (err) {
    console.error('getEmployees error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyLeads = async (req, res) => {
  try {
    // employees under this manager
    const employees = await User.find({ role: 'employee', manager: req.user._id }, '_id');
    const employeeIds = employees.map(e => e._id);

    const leads = await Lead.find({
      $or: [
        { createdBy: req.user._id },
        { assignedTo: { $in: employeeIds } }
      ]
    })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.json(leads);
  } catch (err) {
    console.error('getMyLeads error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid lead id' });
    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    console.error('getLeadById error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEmployeeLeads = async (req, res) => {
  try {
    const empId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(empId)) return res.status(400).json({ message: 'Invalid employee id' });

    // ensure employee belongs to this manager
    const emp = await User.findById(empId);
    if (!emp || String(emp.manager) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Employee not found under this manager' });
    }

    const leads = await Lead.find({ assignedTo: empId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.json(leads);
  } catch (err) {
    console.error('getEmployeeLeads error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTeamCallLogs = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee', manager: req.user._id }, '_id name');
    const employeeIds = employees.map(e => e._id);

    const logs = await CallLog.find({ employee: { $in: employeeIds } })
      .populate('employee', 'name')
      .populate('lead', 'name phone')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    console.error('getTeamCallLogs error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.assignLead = async (req, res) => {
  try {
    const { leadId, employeeId } = req.body;
    if (!leadId || !employeeId) return res.status(400).json({ message: 'leadId and employeeId required' });
    if (!mongoose.Types.ObjectId.isValid(leadId) || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    const employee = await User.findById(employeeId);
    if (!employee || String(employee.manager) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Employee not under this manager' });
    }

    const lead = await Lead.findByIdAndUpdate(leadId, { assignedTo: employeeId }, { new: true })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    res.json({ message: 'Lead assigned', lead });
  } catch (err) {
    console.error('assignLead error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone required' });

    const lead = new Lead({ name, phone, email, notes, createdBy: req.user._id });
    await lead.save();
    const populated = await Lead.findById(lead._id).populate('createdBy', 'name email');
    res.status(201).json({ message: 'Lead created', lead: populated });
  } catch (err) {
    console.error('createLead error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(leadId)) return res.status(400).json({ message: 'Invalid lead id' });

    const updateFields = {};
    const { name, phone, email, status, notes, assignedTo } = req.body;
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (email) updateFields.email = email;
    if (status) updateFields.status = status;
    if (notes) updateFields.notes = notes; // replace; clients can append as needed
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) updateFields.assignedTo = assignedTo;

    const updated = await Lead.findByIdAndUpdate(leadId, updateFields, { new: true })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!updated) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead updated', lead: updated });
  } catch (err) {
    console.error('updateLead error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid lead id' });

    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('deleteLead error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
