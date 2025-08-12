const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const {
  getMyLeads,
  updateLeadNotes,
  addCallLog,
  getMyCallLogs
} = require('../controllers/employeeController');

router.get('/my-leads', auth, roles(['employee']), getMyLeads);
router.put('/update-lead', auth, roles(['employee']), updateLeadNotes);
router.post('/call-log', auth, roles(['employee']), addCallLog);
router.get('/my-call-logs', auth, roles(['employee']), getMyCallLogs);

module.exports = router;
