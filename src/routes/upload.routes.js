const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { authenticate } = require('../middleware/auth.middleware');
const User = require('../models/user.model');

// Configuration multer (stockage temporaire en mémoire)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// POST /api/upload/avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Supprimer l'ancien avatar sur Cloudinary
    if (user.avatar && user.avatar.includes('cloudinary')) {
      const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Upload vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'linkmind/avatars',
          transformation: [{ width: 200, height: 200, crop: 'fill' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    user.avatar = result.secure_url;
    await user.save();

    res.json({
      message: 'Avatar mis à jour avec succès',
      avatarUrl: result.secure_url,
    });
  } catch (err) {
    console.error('❌ [UPLOAD_AVATAR] Erreur:', err);
    next(err);
  }
});

// DELETE /api/upload/avatar
router.delete('/avatar', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.avatar && user.avatar.includes('cloudinary')) {
      const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    user.avatar = null;
    await user.save();

    res.json({ message: 'Avatar supprimé avec succès' });
  } catch (err) {
    console.error('❌ [DELETE_AVATAR] Erreur:', err);
    next(err);
  }
});

module.exports = router;