// routes/employee.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const employeeCtrl = require('../controllers/employeeController');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const Lead = require('../models/Lead');



// Cloudinary config
cloudinary.config({
    cloud_name: 'ddnyldpoj',
    api_key: '516339393367269',
    api_secret: 'MezENQ5tR6yt-cENGki5ILQyp7w',
});

// Multer setup for file handling in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// All routes require authentication and employee role
router.use(auth);

router.get('/leads', roles('employee'), employeeCtrl.getMyLeads);
router.put('/update-lead', roles('employee'), employeeCtrl.updateLeadNotes);
router.post('/call-log', roles('employee'), employeeCtrl.addCallLog);
router.get('/my-call-logs', roles('employee'), employeeCtrl.getMyCallLogs);

// Upload call recording (mp3) to Cloudinary and link to lead
router.post(
    '/upload-call-log',
    roles('employee'),
    upload.single('recording'),
    async (req, res) => {
        try {
            const { leadId } = req.body;
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            if (!leadId) {
                return res.status(400).json({ message: 'Lead ID is required' });
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'video', folder: 'lead-call-logs' },
                async (error, result) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ message: 'Cloudinary upload failed', error });
                    }

                    await Lead.findByIdAndUpdate(leadId, { recordingUrl: result.secure_url });

                    res.json({
                        message: 'Call log uploaded successfully',
                        url: result.secure_url
                    });
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Get all call logs for a specific lead (timeline)
router.get('/lead/:leadId/call-logs', roles('employee'), async (req, res) => {
    try {
        const { leadId } = req.params;

        const logs = await CallLog.find({ lead: leadId })
            .populate('employee', 'name email')
            .sort({ createdAt: -1 });

        res.json(logs);
    } catch (err) {
        console.error('Error fetching lead call logs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;




