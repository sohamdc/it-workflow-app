const express = require('express');
const router = express.Router();

// Simple check to confirm the server is running and reachable.
router.get('/', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;