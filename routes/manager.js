// routes/manager.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const managerCtrl = require('../controllers/managerController');

// All manager routes require auth and manager role (admins can reuse manager role if desired)
router.use(auth, roles('manager'));

// Employees under this manager
router.get('/employees', managerCtrl.getEmployees);

// Leads related to this manager (created by manager or assigned to their employees)
router.get('/leads', managerCtrl.getMyLeads);

// Single lead details
router.get('/lead/:id', managerCtrl.getLeadById);

// Leads assigned to a particular employee (employee must belong to this manager)
router.get('/employee/:id/leads', managerCtrl.getEmployeeLeads);

// Team call logs (for employees under this manager)
router.get('/team-call-logs', managerCtrl.getTeamCallLogs);
    
// Assign a lead to an employee
router.post('/assign-lead', managerCtrl.assignLead);

// Create a lead
router.post('/create-lead', managerCtrl.createLead);

// Update a lead (manager-level update)
router.put('/lead/:id', managerCtrl.updateLead);

// Delete a lead
router.delete('/lead/:id', managerCtrl.deleteLead);

module.exports = router;
