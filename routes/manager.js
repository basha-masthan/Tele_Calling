// routes/manager.js
const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const Lead = require('../models/Lead');


// All routes require authentication and manager role
router.use(auth);
router.use(roles(['manager', 'admin']));

// Get all leads under the manager
router.get('/leads', managerController.getManagerLeads);

// Get leads by specific status
router.get('/leads/status/:status', managerController.getLeadsByStatus);

// Get manager dashboard
router.get('/dashboard', managerController.getManagerDashboard);

// Update lead status and assignment
router.put('/update-lead-status', managerController.updateLeadStatus);

// Reassign leads that need reassignment
router.post('/reassign-leads', managerController.reassignLeads);

// Get employees under the manager
router.get('/employees', managerController.getManagerEmployees);

router.post('/create-lead', async (req, res) => {
    const { name, phone, email, notes, assignedTo, createdBy } = req.body;

    try {
        const lead = new Lead({
            name,
            phone,
            email,
            notes,
            assignedTo,
            createdBy
        });

        await lead.save();
        res.json({ message: 'Lead added successfully', lead });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
