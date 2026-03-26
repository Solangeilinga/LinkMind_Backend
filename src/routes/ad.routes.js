const express = require('express');
const router  = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const c = require('../controllers/ad.controller');

router.use(authenticate);

// Freemium
router.get('/',           c.getAd);
router.post('/:id/click', c.trackClick);

// Admin
router.get('/admin/all',  requireAdmin, c.listAds);
router.post('/admin',     requireAdmin, c.createAd);
router.patch('/:id',      requireAdmin, c.updateAd);
router.delete('/:id',     requireAdmin, c.deleteAd);

module.exports = router;