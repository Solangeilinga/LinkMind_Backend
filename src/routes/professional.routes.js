const express = require('express');
const router  = express.Router();
const c       = require('../controllers/professional.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);

// Routes spécifiques AVANT les routes paramétrées /:id
router.get('/',                              c.list);

// Toutes les routes /bookings/* avant /:id
router.get('/bookings/me',                   c.myBookings);
router.get('/bookings/admin',                requireAdmin, c.allBookings);
router.post('/bookings/:bookingId/confirm',  requireAdmin, c.confirmBooking);
router.post('/bookings/:bookingId/cancel',   requireAdmin, c.cancelBooking);
router.put('/bookings/:id', c.updateBooking);      // ✅ AJOUT : Modifier une demande
router.delete('/bookings/:id', c.deleteBooking);  

// Routes paramétrées en DERNIER
router.get('/:id',                           c.detail);
router.post('/:id/book',                     c.book);

module.exports = router;