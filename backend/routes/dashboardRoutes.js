const express = require('express');
const router = express.Router();
const pool = require('../db');

// Route to get dashboard reports (using the database function for filtering/sorting)
router.get('/', async (req, res) => {
    try {
        const { search = '', category = 'all', location = 'all', type = 'all', sort = 'newest', userId = null } = req.query;

        console.log(`[BACKEND] Dashboard fetch: search="${search}", cat="${category}", loc="${location}", type="${type}", sort="${sort}", user=${userId}`);

        const query = 'SELECT * FROM get_dashboard_reports($1, $2, $3, $4, $5, $6)';
        const params = [
            search, 
            category, 
            location, 
            type, 
            sort, 
            userId ? parseInt(userId) : null
        ];

        const { rows } = await pool.query(query, params);

        // Transform database rows to match frontend expectations
        const reports = rows.map(report => ({
            id: report.id,
            dbId: report.db_id,
            type: report.report_type,
            userId: report.creator_id,
            userName: report.user_name,
            userEmail: report.user_email,
            userStudentId: report.user_student_id,
            userContactNumber: report.user_contact_number,
            itemName: report.title,
            description: report.description,
            category: report.category || 'Other',
            location: report.location_name,
            date: report.reported_at,
            status: report.status,
            imageUrl: report.image_url,
            imageUrls: report.image_urls || [],
            tags: report.tags || []
        }));

        res.json(reports);
    } catch (err) {
        console.error('Error in /api/dashboard:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
