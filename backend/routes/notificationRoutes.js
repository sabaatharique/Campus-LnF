const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET USER NOTIFICATIONS
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM get_user_notifications($1)',
      [userId]
    );

    const notifications = result.rows;
    const claimIds = [...new Set(
      notifications
        .map((n) => n.claim_id)
        .filter((id) => id !== null && id !== undefined)
    )];
    const returnIds = [...new Set(
      notifications
        .map((n) => n.return_id)
        .filter((id) => id !== null && id !== undefined)
    )];

    let claimRequesterMap = new Map();
    let returnRequesterMap = new Map();

    if (claimIds.length > 0) {
      const claimResult = await pool.query(
        'SELECT claim_id, requester_id FROM Claim_Request WHERE claim_id = ANY($1::INT[])',
        [claimIds]
      );
      claimRequesterMap = new Map(
        claimResult.rows.map((row) => [row.claim_id, row.requester_id])
      );
    }

    if (returnIds.length > 0) {
      const returnResult = await pool.query(
        'SELECT return_id, requester_id FROM Return_Request WHERE return_id = ANY($1::INT[])',
        [returnIds]
      );
      returnRequesterMap = new Map(
        returnResult.rows.map((row) => [row.return_id, row.requester_id])
      );
    }

    const enrichedNotifications = notifications.map((notification) => {
      let requesterId = null;

      if (notification.claim_id !== null && notification.claim_id !== undefined) {
        requesterId = claimRequesterMap.get(notification.claim_id) ?? null;
      } else if (notification.return_id !== null && notification.return_id !== undefined) {
        requesterId = returnRequesterMap.get(notification.return_id) ?? null;
      }

      return {
        ...notification,
        requester_id: requesterId,
      };
    });

    res.json(enrichedNotifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// MARK NOTIFICATION AS READ
router.patch('/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    await pool.query(
      'CALL mark_notification_as_read($1, $2)',
      [notificationId, user_id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE NOTIFICATION
router.delete('/:notificationId', async (req, res) => {
  const { notificationId } = req.params;

  try {
    await pool.query(
      'CALL delete_notification($1)',
      [notificationId]
    );
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
