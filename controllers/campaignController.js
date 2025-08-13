const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const User = require('../models/User');

// Get all campaigns for a manager
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user.id })
      .populate('assignedTo', 'name email')
      .populate('leads.lead', 'name email phone status')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
  }
};

// Get a single campaign by ID
const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('leads.lead', 'name email phone status assignedTo');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has access to this campaign
    if (campaign.createdBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign', error: error.message });
  }
};

// Create a new campaign
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      targetAudience,
      customFilters,
      campaignType,
      budget,
      abTesting,
      notifications
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Get target leads based on audience criteria
    let targetLeads = [];
    if (targetAudience === 'custom' && customFilters) {
      targetLeads = await getTargetLeadsByFilters(customFilters, req.user.id);
    } else {
      targetLeads = await getTargetLeadsByAudience(targetAudience, req.user.id);
    }

    // Set A/B testing dates if enabled
    if (abTesting && abTesting.enabled) {
      abTesting.startDate = new Date();
      abTesting.endDate = new Date(Date.now() + abTesting.testDuration * 24 * 60 * 60 * 1000);
    }

    const campaign = new Campaign({
      name,
      description,
      startDate,
      endDate,
      targetAudience,
      customFilters,
      campaignType,
      budget,
      abTesting,
      notifications,
      createdBy: req.user.id,
      leads: targetLeads.map(lead => ({
        lead: lead._id,
        status: 'targeted'
      }))
    });

    await campaign.save();

    // Populate references for response
    await campaign.populate('leads.lead', 'name email phone status');
    await campaign.populate('createdBy', 'name email');

    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error creating campaign', error: error.message });
  }
};

// Update a campaign
const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has access to this campaign
    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update campaign fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'leads' && key !== 'metrics' && key !== 'performance') {
        campaign[key] = req.body[key];
      }
    });

    // Update A/B testing dates if enabled
    if (campaign.abTesting && campaign.abTesting.enabled && !campaign.abTesting.startDate) {
      campaign.abTesting.startDate = new Date();
      campaign.abTesting.endDate = new Date(Date.now() + campaign.abTesting.testDuration * 24 * 60 * 60 * 1000);
    }

    await campaign.save();

    // Populate references for response
    await campaign.populate('leads.lead', 'name email phone status');
    await campaign.populate('createdBy', 'name email');

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error updating campaign', error: error.message });
  }
};

// Delete a campaign
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has access to this campaign
    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting campaign', error: error.message });
  }
};

// Get campaign analytics
const getCampaignAnalytics = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('leads.lead', 'name email phone status assignedTo');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has access to this campaign
    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate additional analytics
    const analytics = {
      ...campaign.metrics,
      totalLeads: campaign.leads.length,
      leadsByStatus: campaign.leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {}),
      progress: campaign.progress,
      duration: campaign.duration,
      abTesting: campaign.abTesting
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

// Update campaign metrics (for tracking)
const updateCampaignMetrics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { impressions, clicks, conversions, cost, variant } = req.body;

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Add daily stats
    const today = new Date().toISOString().split('T')[0];
    let dailyStat = campaign.performance.dailyStats.find(stat => 
      stat.date.toISOString().split('T')[0] === today
    );

    if (!dailyStat) {
      dailyStat = {
        date: new Date(),
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0
      };
      campaign.performance.dailyStats.push(dailyStat);
    }

    // Update daily stats
    if (impressions) dailyStat.impressions += impressions;
    if (clicks) dailyStat.clicks += clicks;
    if (conversions) dailyStat.conversions += conversions;
    if (cost) dailyStat.cost += cost;

    // Update A/B testing results if variant is specified
    if (variant && campaign.abTesting.enabled) {
      const variantResults = campaign.abTesting.results[`variant${variant}`];
      if (variantResults) {
        if (impressions) variantResults.impressions += impressions;
        if (clicks) variantResults.clicks += clicks;
        if (conversions) variantResults.conversions += conversions;
      }
    }

    await campaign.save();

    res.json({ message: 'Metrics updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating metrics', error: error.message });
  }
};

// Get target leads based on audience criteria
const getTargetLeadsByAudience = async (audience, managerId) => {
  let query = { createdBy: managerId };

  switch (audience) {
    case 'new':
      query.status = 'New';
      break;
    case 'hot':
      query.status = 'Hot';
      break;
    case 'follow-up':
      query.status = 'Follow-up';
      break;
    case 'all':
    default:
      // No additional filters
      break;
  }

  return await Lead.find(query).select('_id name email phone status');
};

// Get target leads based on custom filters
const getTargetLeadsByFilters = async (filters, managerId) => {
  let query = { createdBy: managerId };

  if (filters.status && filters.status.length > 0) {
    query.status = { $in: filters.status };
  }

  if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
    query.createdAt = {
      $gte: new Date(filters.dateRange.start),
      $lte: new Date(filters.dateRange.end)
    };
  }

  if (filters.assignedEmployee) {
    query.assignedTo = filters.assignedEmployee;
  }

  return await Lead.find(query).select('_id name email phone status');
};

// Get campaign performance summary
const getCampaignPerformance = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user.id })
      .select('name status metrics startDate endDate');

    const performance = campaigns.map(campaign => ({
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      metrics: campaign.metrics,
      progress: campaign.progress,
      duration: campaign.duration
    }));

    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance data', error: error.message });
  }
};

// Start/Stop A/B testing
const toggleABTesting = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { enabled } = req.body;

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    campaign.abTesting.enabled = enabled;
    
    if (enabled) {
      campaign.abTesting.startDate = new Date();
      campaign.abTesting.endDate = new Date(Date.now() + campaign.abTesting.testDuration * 24 * 60 * 60 * 1000);
    } else {
      campaign.abTesting.startDate = null;
      campaign.abTesting.endDate = null;
    }

    await campaign.save();

    res.json({ message: `A/B testing ${enabled ? 'started' : 'stopped'} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling A/B testing', error: error.message });
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignAnalytics,
  updateCampaignMetrics,
  getCampaignPerformance,
  toggleABTesting
};
