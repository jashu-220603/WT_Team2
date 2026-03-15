const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

/*
-------------------------------------------------------
Get All Notifications for Logged in User
GET /api/notifications
-------------------------------------------------------
*/
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/*
-------------------------------------------------------
Mark Notification as Read
PUT /api/notifications/:id/read
-------------------------------------------------------
*/
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.user.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to update this notification" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/*
-------------------------------------------------------
Mark All Notifications as Read
PUT /api/notifications/read-all
-------------------------------------------------------
*/
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
