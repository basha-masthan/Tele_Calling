const mongoose = require('mongoose');
const Lead = require('./models/Lead');
require('dotenv').config();

// Sample data for testing analytics
const sampleLeads = [
    // Technology sector leads
    { name: 'Tech Corp A', phone: '+91-9876543210', email: 'tech1@example.com', sector: 'Technology', region: 'North', status: 'Hot' },
    { name: 'Tech Corp B', phone: '+91-9876543211', email: 'tech2@example.com', sector: 'Technology', region: 'South', status: 'Interested' },
    { name: 'Tech Corp C', phone: '+91-9876543212', email: 'tech3@example.com', sector: 'Technology', region: 'East', status: 'New' },
    { name: 'Tech Corp D', phone: '+91-9876543213', email: 'tech4@example.com', sector: 'Technology', region: 'West', status: 'Hot' },
    { name: 'Tech Corp E', phone: '+91-9876543214', email: 'tech5@example.com', sector: 'Technology', region: 'Central', status: 'Interested' },
    
    // Healthcare sector leads
    { name: 'Health Clinic A', phone: '+91-9876543215', email: 'health1@example.com', sector: 'Healthcare', region: 'North', status: 'Hot' },
    { name: 'Health Clinic B', phone: '+91-9876543216', email: 'health2@example.com', sector: 'Healthcare', region: 'South', status: 'New' },
    { name: 'Health Clinic C', phone: '+91-9876543217', email: 'health3@example.com', sector: 'Healthcare', region: 'East', status: 'Interested' },
    { name: 'Health Clinic D', phone: '+91-9876543218', email: 'health4@example.com', sector: 'Healthcare', region: 'West', status: 'Follow-up' },
    
    // Finance sector leads
    { name: 'Finance Bank A', phone: '+91-9876543219', email: 'finance1@example.com', sector: 'Finance', region: 'North', status: 'Hot' },
    { name: 'Finance Bank B', phone: '+91-9876543220', email: 'finance2@example.com', sector: 'Finance', region: 'South', status: 'Interested' },
    { name: 'Finance Bank C', phone: '+91-9876543221', email: 'finance3@example.com', sector: 'Finance', region: 'East', status: 'New' },
    { name: 'Finance Bank D', phone: '+91-9876543222', email: 'finance4@example.com', sector: 'Finance', region: 'West', status: 'Hot' },
    
    // Education sector leads
    { name: 'University A', phone: '+91-9876543223', email: 'edu1@example.com', sector: 'Education', region: 'North', status: 'Interested' },
    { name: 'University B', phone: '+91-9876543224', email: 'edu2@example.com', sector: 'Education', region: 'South', status: 'New' },
    { name: 'University C', phone: '+91-9876543225', email: 'edu3@example.com', sector: 'Education', region: 'East', status: 'Hot' },
    
    // Retail sector leads
    { name: 'Retail Store A', phone: '+91-9876543226', email: 'retail1@example.com', sector: 'Retail', region: 'West', status: 'Interested' },
    { name: 'Retail Store B', phone: '+91-9876543227', email: 'retail2@example.com', sector: 'Retail', region: 'Central', status: 'New' },
    { name: 'Retail Store C', phone: '+91-9876543228', email: 'retail3@example.com', sector: 'Retail', region: 'North', status: 'Hot' },
    
    // Manufacturing sector leads
    { name: 'Manufacturing Co A', phone: '+91-9876543229', email: 'mfg1@example.com', sector: 'Manufacturing', region: 'South', status: 'Interested' },
    { name: 'Manufacturing Co B', phone: '+91-9876543230', email: 'mfg2@example.com', sector: 'Manufacturing', region: 'East', status: 'New' },
    { name: 'Manufacturing Co C', phone: '+91-9876543231', email: 'mfg3@example.com', sector: 'Manufacturing', region: 'West', status: 'Hot' },
    
    // Real Estate sector leads
    { name: 'Real Estate A', phone: '+91-9876543232', email: 'real1@example.com', sector: 'Real Estate', region: 'Central', status: 'Interested' },
    { name: 'Real Estate B', phone: '+91-9876543233', email: 'real2@example.com', sector: 'Real Estate', region: 'North', status: 'New' },
    { name: 'Real Estate C', phone: '+91-9876543234', email: 'real3@example.com', sector: 'Real Estate', region: 'South', status: 'Hot' },
    
    // International leads
    { name: 'Global Corp A', phone: '+1-555-123-4567', email: 'global1@example.com', sector: 'Technology', region: 'International', status: 'Hot' },
    { name: 'Global Corp B', phone: '+1-555-123-4568', email: 'global2@example.com', sector: 'Finance', region: 'International', status: 'Interested' },
    { name: 'Global Corp C', phone: '+1-555-123-4569', email: 'global3@example.com', sector: 'Healthcare', region: 'International', status: 'New' },
    
    // Additional leads for better distribution
    { name: 'Startup A', phone: '+91-9876543240', email: 'startup1@example.com', sector: 'Technology', region: 'Central', status: 'Interested' },
    { name: 'Startup B', phone: '+91-9876543241', email: 'startup2@example.com', sector: 'Technology', region: 'North', status: 'New' },
    { name: 'Hospital A', phone: '+91-9876543242', email: 'hospital1@example.com', sector: 'Healthcare', region: 'Central', status: 'Hot' },
    { name: 'Hospital B', phone: '+91-9876543243', email: 'hospital2@example.com', sector: 'Healthcare', region: 'South', status: 'Interested' },
    { name: 'Bank A', phone: '+91-9876543244', email: 'bank1@example.com', sector: 'Finance', region: 'Central', status: 'New' },
    { name: 'Bank B', phone: '+91-9876543245', email: 'bank2@example.com', sector: 'Finance', region: 'East', status: 'Hot' },
];

async function addSampleData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing leads (optional - comment out if you want to keep existing data)
        // await Lead.deleteMany({});
        // console.log('🗑️ Cleared existing leads');

        // Add sample leads
        const leads = [];
        for (const leadData of sampleLeads) {
            const lead = new Lead({
                ...leadData,
                createdBy: null, // Will be set to admin user if needed
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
            });
            leads.push(lead);
        }

        await Lead.insertMany(leads);
        console.log(`✅ Added ${leads.length} sample leads`);

        // Display summary
        const totalLeads = await Lead.countDocuments();
        console.log(`📊 Total leads in database: ${totalLeads}`);

        // Show sector distribution
        const sectorStats = await Lead.aggregate([
            { $group: { _id: '$sector', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n📈 Sector Distribution:');
        sectorStats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} leads`);
        });

        // Show region distribution
        const regionStats = await Lead.aggregate([
            { $group: { _id: '$region', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n🌍 Region Distribution:');
        regionStats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} leads`);
        });

        // Show status distribution
        const statusStats = await Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n📊 Status Distribution:');
        statusStats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} leads`);
        });

        console.log('\n🎉 Sample data added successfully!');
        console.log('You can now test the analytics charts in the admin dashboard.');

    } catch (error) {
        console.error('❌ Error adding sample data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    addSampleData();
}

module.exports = { addSampleData };
