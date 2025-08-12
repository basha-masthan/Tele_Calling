const User = require('../models/User');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');

// Get all employees under a manager
exports.getEmployees = async (req, res) => {
  const employees = await User.find({ manager: req.user._id, role: 'employee' }).select('-password');
  res.json(employees);
};

// Assign a lead to an employee
exports.assignLeadToEmployee = async (req, res) => {
  const { leadId, employeeId } = req.body;

  const employee = await User.findOne({ _id: employeeId, manager: req.user._id, role: 'employee' });
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found or not under your management' });
  }

  const lead = await Lead.findByIdAndUpdate(
    leadId,
    { assignedTo: employeeId, assignedBy: req.user._id },
    { new: true }
  );

  res.json(lead);
};

// Get all leads under this manager
exports.getLeads = async (req, res) => {
  const leads = await Lead.find({ assignedBy: req.user._id }).populate('assignedTo', 'name email');
  res.json(leads);
};

// View call logs of employees under this manager
exports.getCallLogs = async (req, res) => {
  const employees = await User.find({ manager: req.user._id }).select('_id');
  const employeeIds = employees.map(emp => emp._id);

  const logs = await CallLog.find({ employee: { $in: employeeIds } })
    .populate('lead', 'name phone')
    .populate('employee', 'name email');
  
  res.json(logs);
};
