const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const {
  getEmployees,
  assignLeadToEmployee,
  getLeads,
  getCallLogs
} = require('../controllers/managerController');

router.get('/employees', auth, roles(['manager']), getEmployees);
router.post('/assign-lead', auth, roles(['manager']), assignLeadToEmployee);
router.get('/leads', auth, roles(['manager']), getLeads);
router.get('/call-logs', auth, roles(['manager']), getCallLogs);

module.exports = router;
