const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const SimCard = require('../models/SimCard');
const CallLog = require('../models/CallLog');
const AdminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// All admin routes require authentication and admin role
router.use(auth);
router.use(roles(['admin']));

// ===== USER MANAGEMENT =====
// Get all managers
router.get('/managers', async (req, res) => {
    try {
        const managers = await User.find({ role: 'manager' })
            .select('name email role createdAt')
            .sort({ createdAt: -1 });
        res.json(managers);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all employees
router.get('/employees', async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' })
            .populate('manager', 'name email')
            .select('name email role manager createdAt')
            .sort({ createdAt: -1 });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new manager
router.post('/managers', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        const manager = new User({
            name,
            email,
            password,
            role: 'manager'
        });
        await manager.save();
        
        // Remove password from response
        const managerResponse = manager.toObject();
        delete managerResponse.password;
        
        res.status(201).json({ message: 'Manager created successfully', manager: managerResponse });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Create new employee
router.post('/employees', async (req, res) => {
    try {
        const { name, email, password, managerId } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Verify manager exists
        if (managerId) {
            const manager = await User.findById(managerId);
            if (!manager || manager.role !== 'manager') {
                return res.status(400).json({ error: 'Invalid manager ID' });
            }
        }
        
        const employee = new User({
            name,
            email,
            password,
            role: 'employee',
            manager: managerId
        });
        await employee.save();
        
        // Remove password from response
        const employeeResponse = employee.toObject();
        delete employeeResponse.password;
        
        res.status(201).json({ message: 'Employee created successfully', employee: employeeResponse });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, manager } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (manager !== undefined) user.manager = manager;
        
        await user.save();
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({ message: 'User updated successfully', user: userResponse });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user has assigned leads
        const assignedLeads = await Lead.find({ assignedTo: id });
        if (assignedLeads.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete user with assigned leads. Please reassign leads first.' 
            });
        }
        
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// ===== LEAD MANAGEMENT =====
// Get all leads
router.get('/leads', async (req, res) => {
    try {
        const leads = await Lead.find()
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single lead by ID
router.get('/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
        
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Create new lead
router.post('/leads', async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            status,
            sector,
            region,
            notes,
            assignedTo,
            followUpDate,
            sellingPrice,
            lossReason
        } = req.body;

        // Validate required fields
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        // Check if lead with same phone already exists
        const existingLead = await Lead.findOne({ phone });
        if (existingLead) {
            return res.status(400).json({ error: 'Lead with this phone number already exists' });
        }

        const lead = new Lead({
            name,
            phone,
            email,
            status: status || 'New',
            sector: sector || 'Other',
            region: region || 'Central',
            notes,
            assignedTo,
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
            lossReason,
            createdBy: req.user.id
        });

        await lead.save();

        const populatedLead = await Lead.findById(lead._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.status(201).json(populatedLead);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Update lead
router.put('/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const {
            name,
            phone,
            email,
            status,
            sector,
            region,
            notes,
            assignedTo,
            followUpDate,
            sellingPrice,
            lossReason
        } = req.body;

        // Validate required fields
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        // Check if phone number is already used by another lead
        if (phone !== lead.phone) {
            const existingLead = await Lead.findOne({ phone });
            if (existingLead) {
                return res.status(400).json({ error: 'Lead with this phone number already exists' });
            }
        }

        // Update fields
        lead.name = name;
        lead.phone = phone;
        lead.email = email;
        lead.status = status;
        lead.sector = sector;
        lead.region = region;
        lead.notes = notes;
        lead.assignedTo = assignedTo;
        lead.followUpDate = followUpDate ? new Date(followUpDate) : undefined;
        lead.sellingPrice = sellingPrice ? parseFloat(sellingPrice) : undefined;
        lead.lossReason = lossReason;

        await lead.save();

        const updatedLead = await Lead.findById(lead._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.json(updatedLead);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Delete lead
router.delete('/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await Lead.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lead deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Get lead analytics
router.get('/leads/analytics', async (req, res) => {
    try {
        const leads = await Lead.find();
        
        // Status distribution
        const statusDistribution = leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});
        
        // Sector distribution
        const sectorDistribution = leads.reduce((acc, lead) => {
            acc[lead.sector] = (acc[lead.sector] || 0) + 1;
            return acc;
        }, {});
        
        // Region distribution
        const regionDistribution = leads.reduce((acc, lead) => {
            acc[lead.region] = (acc[lead.region] || 0) + 1;
            return acc;
        }, {});
        
        // Hot leads by sector
        const hotLeadsBySector = leads
            .filter(lead => lead.status === 'Hot')
            .reduce((acc, lead) => {
                acc[lead.sector] = (acc[lead.sector] || 0) + 1;
                return acc;
            }, {});
        
        // Interested leads by sector
        const interestedLeadsBySector = leads
            .filter(lead => lead.status === 'Interested')
            .reduce((acc, lead) => {
                acc[lead.sector] = (acc[lead.sector] || 0) + 1;
                return acc;
            }, {});
        
        // Hot leads by region
        const hotLeadsByRegion = leads
            .filter(lead => lead.status === 'Hot')
            .reduce((acc, lead) => {
                acc[lead.region] = (acc[lead.region] || 0) + 1;
                return acc;
            }, {});
        
        // Interested leads by region
        const interestedLeadsByRegion = leads
            .filter(lead => lead.status === 'Interested')
            .reduce((acc, lead) => {
                acc[lead.region] = (acc[lead.region] || 0) + 1;
                return acc;
            }, {});
        
        // Monthly lead creation trend
        const monthlyLeadTrend = leads.reduce((acc, lead) => {
            const month = new Date(lead.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});
        
        // Sector-Region matrix for hot leads
        const sectorRegionMatrix = leads
            .filter(lead => lead.status === 'Hot' || lead.status === 'Interested')
            .reduce((acc, lead) => {
                if (!acc[lead.sector]) acc[lead.sector] = {};
                if (!acc[lead.sector][lead.region]) acc[lead.sector][lead.region] = { hot: 0, interested: 0 };
                if (lead.status === 'Hot') acc[lead.sector][lead.region].hot++;
                if (lead.status === 'Interested') acc[lead.sector][lead.region].interested++;
                return acc;
            }, {});
        
        res.json({
            statusDistribution,
            sectorDistribution,
            regionDistribution,
            hotLeadsBySector,
            interestedLeadsBySector,
            hotLeadsByRegion,
            interestedLeadsByRegion,
            monthlyLeadTrend,
            sectorRegionMatrix,
            totalLeads: leads.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new lead
router.post('/leads', async (req, res) => {
    try {
        const leadData = {
            ...req.body,
            createdBy: req.user.id
        };
        
        const lead = new Lead(leadData);
        await lead.save();
        
        const populatedLead = await Lead.findById(lead._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
        
        res.status(201).json({ message: 'Lead created successfully', lead: populatedLead });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Update lead
router.put('/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        // Update lead fields
        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
                lead[key] = updates[key];
            }
        });
        
        await lead.save();
        
        const updatedLead = await Lead.findById(id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
        
        res.json({ message: 'Lead updated successfully', lead: updatedLead });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Delete lead
router.delete('/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        await Lead.findByIdAndDelete(id);
        res.json({ message: 'Lead deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// ===== CAMPAIGN MANAGEMENT =====
// Get campaign analytics
router.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new campaign
router.post('/campaigns', async (req, res) => {
    try {
        const campaignData = {
            ...req.body,
            createdBy: req.user.id,
            metrics: {
                reach: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                engagementRate: 0,
                conversionRate: 0,
                ctr: 0,
                roi: 0,
                cost: 0,
                revenue: 0
            },
            performance: {
                dailyStats: [],
                audienceInsights: {
                    demographics: {
                        ageGroups: new Map(),
                        locations: new Map(),
                        interests: []
                    },
                    behavior: {
                        engagementTime: 0,
                        bounceRate: 0,
                        returnRate: 0
                    }
                }
            },
            abTesting: {
                enabled: false,
                results: {
                    variantA: {
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        ctr: 0,
                        conversionRate: 0
                    },
                    variantB: {
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        ctr: 0,
                        conversionRate: 0
                    },
                    winner: null
                }
            }
        };

        const campaign = new Campaign(campaignData);
        await campaign.save();

        const populatedCampaign = await Campaign.findById(campaign._id)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email');

        res.status(201).json(populatedCampaign);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Get campaign performance analytics
router.get('/campaigns/analytics', async (req, res) => {
    try {
        const campaigns = await Campaign.find();
        
        // Campaign status distribution
        const statusDistribution = campaigns.reduce((acc, campaign) => {
            acc[campaign.status] = (acc[campaign.status] || 0) + 1;
            return acc;
        }, {});
        
        // Campaign type distribution
        const typeDistribution = campaigns.reduce((acc, campaign) => {
            acc[campaign.campaignType] = (acc[campaign.campaignType] || 0) + 1;
            return acc;
        }, {});
        
        // Monthly campaign creation trend
        const monthlyTrend = campaigns.reduce((acc, campaign) => {
            const month = new Date(campaign.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});
        
        // Campaign performance metrics
        const performanceMetrics = campaigns.map(campaign => ({
            id: campaign._id,
            name: campaign.name,
            impressions: campaign.metrics.impressions,
            clicks: campaign.metrics.clicks,
            conversions: campaign.metrics.conversions,
            ctr: campaign.metrics.ctr,
            conversionRate: campaign.metrics.conversionRate,
            roi: campaign.metrics.roi
        }));
        
        res.json({
            statusDistribution,
            typeDistribution,
            monthlyTrend,
            performanceMetrics,
            totalCampaigns: campaigns.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== SIM MANAGEMENT =====
// Get SIM cards status
router.get('/sims', async (req, res) => {
    try {
        const sims = await SimCard.find()
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(sims);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new SIM card
router.post('/sims', async (req, res) => {
    try {
        const simData = {
            ...req.body,
            createdBy: req.user.id
        };
        
        const sim = new SimCard(simData);
        await sim.save();
        
        const populatedSim = await SimCard.findById(sim._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
        
        res.status(201).json({ message: 'SIM card created successfully', sim: populatedSim });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Assign SIM to employee
router.post('/sims/assign', async (req, res) => {
    try {
        const { simId, employeeId } = req.body;
        
        // Verify employee exists
        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== 'employee') {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }
        
        // Update SIM assignment
        const sim = await SimCard.findById(simId);
        if (!sim) {
            return res.status(404).json({ error: 'SIM card not found' });
        }
        
        sim.assignedTo = employeeId;
        sim.assignedAt = new Date();
        sim.lastModifiedBy = req.user.id;
        
        await sim.save();
        
        const populatedSim = await SimCard.findById(simId)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');
        
        res.json({ message: 'SIM assigned successfully', sim: populatedSim });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// ===== CALL ANALYTICS =====
// Get call analytics
router.get('/calls/analytics', async (req, res) => {
    try {
        const callLogs = await CallLog.find()
            .populate('lead', 'name phone email')
            .populate('employee', 'name email')
            .populate('simCard', 'simNumber carrier')
            .sort({ createdAt: -1 });
        
        // Calculate analytics
        const totalCalls = callLogs.length;
        const successfulCalls = callLogs.filter(log => log.callStatus === 'completed').length;
        const missedCalls = callLogs.filter(log => log.callStatus === 'missed').length;
        const rejectedCalls = callLogs.filter(log => log.callStatus === 'declined').length;
        
        // Average call duration
        const totalDuration = callLogs.reduce((sum, log) => sum + (log.callDuration || 0), 0);
        const averageCallDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
        
        // Calls by hour
        const callsByHour = {};
        callLogs.forEach(log => {
            const hour = new Date(log.callStartTime).getHours();
            callsByHour[hour] = (callsByHour[hour] || 0) + 1;
        });
        
        // Calls by day
        const callsByDay = {};
        callLogs.forEach(log => {
            const day = new Date(log.callStartTime).toLocaleDateString('en-US', { weekday: 'long' });
            callsByDay[day] = (callsByDay[day] || 0) + 1;
        });
        
        // Top performers
        const employeeStats = {};
        callLogs.forEach(log => {
            const employeeId = log.employee._id.toString();
            if (!employeeStats[employeeId]) {
                employeeStats[employeeId] = {
                    name: log.employee.name,
                    calls: 0,
                    successfulCalls: 0
                };
            }
            employeeStats[employeeId].calls++;
            if (log.callStatus === 'completed') {
                employeeStats[employeeId].successfulCalls++;
            }
        });
        
        const topPerformers = Object.values(employeeStats)
            .map(emp => ({
                name: emp.name,
                calls: emp.calls,
                successRate: Math.round((emp.successfulCalls / emp.calls) * 100)
            }))
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 5);
        
        res.json({
            totalCalls,
            successfulCalls,
            missedCalls,
            rejectedCalls,
            averageCallDuration,
            callsByHour,
            callsByDay,
            topPerformers
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== PERFORMANCE METRICS =====
// Get overall performance dashboard
router.get('/performance/dashboard', async (req, res) => {
    try {
        const [leads, campaigns, users, sims, callLogs] = await Promise.all([
            Lead.find(),
            Campaign.find(),
            User.find(),
            SimCard.find(),
            CallLog.find()
        ]);
        
        // Calculate key metrics
        const totalUsers = users.length;
        const totalLeads = leads.length;
        const totalCalls = callLogs.length;
        const activeSims = sims.filter(sim => sim.status === 'Active').length;
        
        // Lead conversion rate
        const wonLeads = leads.filter(l => l.status === 'Won').length;
        const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;
        
        // Call success rate
        const successfulCalls = callLogs.filter(log => log.callStatus === 'completed').length;
        const callSuccessRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : 0;
        
        // Monthly growth (mock data for now)
        const monthlyGrowth = 12.5;
        
        res.json({
            totalUsers,
            totalLeads,
            totalCalls,
            activeSims,
            conversionRate: parseFloat(conversionRate),
            callSuccessRate: parseFloat(callSuccessRate),
            monthlyGrowth
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== LEAD SCORING =====
// Get lead scoring analytics
router.get('/leads/scoring', async (req, res) => {
    try {
        const leads = await Lead.find();
        
        // Calculate lead scores based on various factors
        const scoredLeads = leads.map(lead => {
            let score = 0;
            
            // Status-based scoring
            switch (lead.status) {
                case 'Hot': score += 40; break;
                case 'Interested': score += 30; break;
                case 'Follow-up': score += 20; break;
                case 'New': score += 10; break;
                case 'Won': score += 50; break;
                case 'Lost': score += 0; break;
            }
            
            // Sector-based scoring (example: Technology and Finance get higher scores)
            if (lead.sector === 'Technology') score += 15;
            else if (lead.sector === 'Finance') score += 15;
            else if (lead.sector === 'Healthcare') score += 10;
            else score += 5;
            
            // Region-based scoring (example: International gets higher score)
            if (lead.region === 'International') score += 10;
            else score += 5;
            
            // Time-based scoring (newer leads get higher scores)
            const daysSinceCreation = Math.floor((new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24));
            if (daysSinceCreation <= 7) score += 15;
            else if (daysSinceCreation <= 30) score += 10;
            else if (daysSinceCreation <= 90) score += 5;
            
            return {
                leadId: lead._id,
                name: lead.name,
                status: lead.status,
                sector: lead.sector,
                region: lead.region,
                score: Math.min(100, score),
                createdAt: lead.createdAt
            };
        });
        
        // Sort by score
        scoredLeads.sort((a, b) => b.score - a.score);
        
        // Categorize leads
        const highPriority = scoredLeads.filter(lead => lead.score >= 70).length;
        const mediumPriority = scoredLeads.filter(lead => lead.score >= 40 && lead.score < 70).length;
        const lowPriority = scoredLeads.filter(lead => lead.score < 40).length;
        
        res.json({
            highPriority,
            mediumPriority,
            lowPriority,
            scoredLeads: scoredLeads.slice(0, 20), // Top 20 leads
            averageScore: Math.round(scoredLeads.reduce((sum, lead) => sum + lead.score, 0) / scoredLeads.length)
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ASSIGNMENT MANAGEMENT =====
router.post('/assign-employee', AdminController.assignEmployee);

// ===== SYSTEM STATISTICS =====
// Get system overview statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const [leads, campaigns, users, sims, callLogs] = await Promise.all([
            Lead.find(),
            Campaign.find(),
            User.find(),
            SimCard.find(),
            CallLog.find()
        ]);
        
        // User statistics
        const userStats = {
            total: users.length,
            admins: users.filter(u => u.role === 'admin').length,
            managers: users.filter(u => u.role === 'manager').length,
            employees: users.filter(u => u.role === 'employee').length
        };
        
        // Lead statistics
        const leadStats = {
            total: leads.length,
            byStatus: leads.reduce((acc, lead) => {
                acc[lead.status] = (acc[lead.status] || 0) + 1;
                return acc;
            }, {}),
            bySector: leads.reduce((acc, lead) => {
                acc[lead.sector] = (acc[lead.sector] || 0) + 1;
                return acc;
            }, {}),
            byRegion: leads.reduce((acc, lead) => {
                acc[lead.region] = (acc[lead.region] || 0) + 1;
                return acc;
            }, {})
        };
        
        // Campaign statistics
        const campaignStats = {
            total: campaigns.length,
            active: campaigns.filter(c => c.status === 'Active').length,
            completed: campaigns.filter(c => c.status === 'Completed').length,
            byType: campaigns.reduce((acc, campaign) => {
                acc[campaign.campaignType] = (acc[campaign.campaignType] || 0) + 1;
                return acc;
            }, {})
        };
        
        // SIM statistics
        const simStats = {
            total: sims.length,
            active: sims.filter(s => s.status === 'Active').length,
            assigned: sims.filter(s => s.assignedTo).length,
            byCarrier: sims.reduce((acc, sim) => {
                acc[sim.carrier] = (acc[sim.carrier] || 0) + 1;
                return acc;
            }, {})
        };
        
        // Call statistics
        const callStats = {
            total: callLogs.length,
            successful: callLogs.filter(log => log.callStatus === 'completed').length,
            averageDuration: callLogs.length > 0 ? 
                Math.round(callLogs.reduce((sum, log) => sum + (log.callDuration || 0), 0) / callLogs.length) : 0
        };
        
        res.json({
            userStats,
            leadStats,
            campaignStats,
            simStats,
            callStats,
            lastUpdated: new Date()
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
