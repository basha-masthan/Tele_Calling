require('dotenv').config();
require('express-async-errors');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Database connection
const connectDB = require('./config/db');

// Swagger documentation
const swagger = require('./swagger');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const employeeRoutes = require('./routes/employee');
const leadRoutes = require('./routes/leads');
const importExportRoutes = require('./routes/importExport');
const salesPipelineRoutes = require('./routes/salesPipeline');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Swagger API Documentation
app.use('/api-docs', swagger.serve, swagger.setup);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/sales-pipelines', salesPipelineRoutes);

// Serve static HTML files from public folder
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 TeleCRM Server running on port ${PORT}`);
      console.log(`📚 API Documentation available at: http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('❌ DB connection failed', err);
    process.exit(1);
  });
