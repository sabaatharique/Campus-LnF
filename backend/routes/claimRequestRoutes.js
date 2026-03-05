const express = require('express');
const pool = require('../db');
const router = express.Router();

// CREATE CLAIM REQUEST FOR FOUND ITEMS
router.post('/create/found', async (req, res) => {
  const { requester_id, found_report_id, message, image_urls = [] } = req.body;

  try {
    await pool.query(
      'CALL create_claim_request_found($1, $2, $3, $4)',
      [requester_id, found_report_id, message, image_urls]
    );

    res.status(201).json({ message: 'Claim request created successfully' });
  } catch (err) {
    console.error('Error creating claim request for found item:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE CLAIM REQUEST FOR LOST ITEMS (someone else found it)
router.post('/create/lost', async (req, res) => {
  const { requester_id, lost_report_id, message, image_urls = [] } = req.body;

  try {
    await pool.query(
      'CALL create_return_request_lost($1, $2, $3, $4)',
      [requester_id, lost_report_id, message, image_urls]
    );

    res.status(201).json({ message: 'Return report created successfully' });
  } catch (err) {
    console.error('Error creating return report for lost item:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET CLAIM REQUESTS FOR USER'S FOUND ITEMS
router.get('/user/claims/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM get_user_claim_requests($1)',
      [parseInt(userId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching claim requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET RETURN REQUESTS FOR USER'S LOST ITEMS
router.get('/user/returns/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM get_user_return_requests($1)',
      [parseInt(userId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching return requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- SPECIFIC ROUTES FIRST ---

// ACCEPT RETURN REQUEST
router.post('/returns/:returnId/accept', async (req, res) => {
  const { returnId } = req.params;
  try {
    await pool.query('CALL accept_return_request($1)', [parseInt(returnId)]);
    res.json({ message: 'Return request accepted' });
  } catch (err) {
    console.error('Error accepting return request:', err);
    res.status(500).json({ error: err.message });
  }
});

// REJECT RETURN REQUEST
router.post('/returns/:returnId/reject', async (req, res) => {
  const { returnId } = req.params;
  try {
    await pool.query('CALL reject_return_request($1)', [parseInt(returnId)]);
    res.json({ message: 'Return request rejected' });
  } catch (err) {
    console.error('Error rejecting return request:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GENERIC PARAMETER ROUTES LAST ---

// ACCEPT CLAIM REQUEST
router.post('/:claimId/accept', async (req, res) => {
  const { claimId } = req.params;
  try {
    await pool.query('CALL accept_claim_request($1)', [parseInt(claimId)]);
    res.json({ message: 'Claim request accepted' });
  } catch (err) {
    console.error('Error accepting claim request:', err);
    res.status(500).json({ error: err.message });
  }
});

// REJECT CLAIM REQUEST
router.post('/:claimId/reject', async (req, res) => {
  const { claimId } = req.params;
  try {
    await pool.query('CALL reject_claim_request($1)', [parseInt(claimId)]);
    res.json({ message: 'Claim request rejected' });
  } catch (err) {
    console.error('Error rejecting claim request:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
