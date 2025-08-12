const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');

// POST /leads - Add new lead
router.post('/', async (req, res) => {
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

// GET /leads - Get all leads
router.get('/', async (req, res) => {
    try {
        const leads = await Lead.find()
            .populate('assignedTo createdBy', 'name email role');
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /leads/unassigned - Get leads without assignedTo
router.get('/unassigned', async (req, res) => {
    try {
        const leads = await Lead.find({ assignedTo: { $exists: false } })
            .select('-__v');
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /leads/assign - Assign multiple leads to a user
router.post('/assign', async (req, res) => {
    try {
        const { userId, leadIds } = req.body;

        if (!userId || !leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        await Lead.updateMany(
            { _id: { $in: leadIds } },
            { $set: { assignedTo: userId } }
        );

        res.json({ message: 'Leads assigned successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to assign leads' });
    }
});

// GET /leads/assignments - Get all assigned leads with user info
router.get('/assignments', async (req, res) => {
    try {
        const assignments = await Lead.find({ assignedTo: { $exists: true } })
            .populate('assignedTo', 'name email')
            .select('-__v');
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// GET /users - Fetch all users (name, email only)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({'role':'employee'}, 'name email');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;
