const PDFDocument = require('pdfkit');
const { ReportTemplate } = require('../models/config.model');

// ─── Couleurs LinkMind ────────────────────────────────────────────────────────
const COLORS = {
  primary:    '#77021D',
  secondary:  '#F5B731',
  accent:     '#E07B2A',
  bg:         '#FAF7F5',
  surface:    '#FFFFFF',
  muted:      '#8A7070',
  divider:    '#EDE5E3',
  dark:       '#1A0A0D',
};

// ─── Humeur → couleur ─────────────────────────────────────────────────────────
const moodColor = (score) => {
  if (score >= 4) return '#2ECC71';
  if (score >= 3) return '#F5B731';
  return '#E74C3C';
};

const moodLabel = (score) => {
  const labels = { 1: 'Très mal', 2: 'Mal', 3: 'Neutre', 4: 'Bien', 5: 'Très bien' };
  return labels[score] || '—';
};

// ─── Générateur principal ─────────────────────────────────────────────────────
const generateReport = async (user, moodHistory, challenges, badges) => {
  // Fetch conseil from DB before starting PDF stream
  const range = avgScore >= 4 ? 'high' : avgScore >= 3 ? 'medium' : 'low';
  const template = await ReportTemplate.findOne({ moodRange: range, isActive: true }).catch(() => null);
  const conseil = template?.conseil || "Prends soin de toi au quotidien. Mindo est là pour t'accompagner.";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // largeur utile
    const pageH = doc.page.height;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return [r, g, b];
    };

    const fillColor = (hex) => doc.fillColor(hexToRgb(hex));
    const strokeColor = (hex) => doc.strokeColor(hexToRgb(hex));

    const sectionTitle = (title, y) => {
      fillColor(COLORS.primary);
      doc.fontSize(14).font('Helvetica-Bold').text(title, 50, y);
      strokeColor(COLORS.primary);
      doc.moveTo(50, y + 20).lineTo(50 + W, y + 20).lineWidth(1.5).stroke();
      return y + 32;
    };

    const checkPageBreak = (needed = 80) => {
      if (doc.y + needed > pageH - 60) doc.addPage();
    };

    // ── HEADER ───────────────────────────────────────────────────────────────
    // Fond bordeaux
    fillColor(COLORS.primary);
    doc.rect(0, 0, doc.page.width, 110).fill();

    // Logo / emoji
    doc.fontSize(32).text('🧠', 50, 28);

    // Titre
    doc.fillColor('white').fontSize(26).font('Helvetica-Bold')
       .text('LinkMind', 95, 28);
    doc.fontSize(11).font('Helvetica')
       .text('Rapport de bien-être personnel', 95, 58);

    // Date
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(10).text(`Généré le ${dateStr}`, 50, 82);

    // ── INFOS USER ────────────────────────────────────────────────────────────
    let y = 130;
    fillColor(COLORS.dark);
    doc.fontSize(18).font('Helvetica-Bold')
       .text(`Bonjour, ${user.firstName || user.name || 'Utilisateur'} 👋`, 50, y);
    y += 28;

    // Stats rapides
    const stats = [
      { label: 'Points totaux',  value: `${user.totalPoints || 0} pts`, icon: '⚡' },
      { label: 'Niveau',         value: (user.level || 'bronze').charAt(0).toUpperCase() + (user.level || 'bronze').slice(1), icon: '🏅' },
      { label: 'Jours consécutifs', value: `${user.streakDays || 0} jours`, icon: '🔥' },
      { label: 'Défis complétés',   value: `${challenges.length}`, icon: '✅' },
    ];

    const cardW = (W - 30) / 4;
    stats.forEach((s, i) => {
      const x = 50 + i * (cardW + 10);
      fillColor(COLORS.bg);
      doc.roundedRect(x, y, cardW, 58, 8).fill();
      strokeColor(COLORS.divider);
      doc.roundedRect(x, y, cardW, 58, 8).lineWidth(0.5).stroke();
      doc.fontSize(18).text(s.icon, x + 8, y + 8);
      fillColor(COLORS.dark);
      doc.fontSize(15).font('Helvetica-Bold').text(s.value, x + 8, y + 28);
      fillColor(COLORS.muted);
      doc.fontSize(8).font('Helvetica').text(s.label, x + 8, y + 44);
    });
    y += 76;

    // ── HUMEUR ────────────────────────────────────────────────────────────────
    y = sectionTitle('📊 Historique d\'humeur (14 derniers jours)', y + 8);

    if (!moodHistory || moodHistory.length === 0) {
      fillColor(COLORS.muted);
      doc.fontSize(11).font('Helvetica-Oblique')
         .text('Aucune humeur enregistrée sur cette période.', 50, y);
      y += 24;
    } else {
      // Graphique en barres
      const barW     = Math.min(28, (W - 10) / moodHistory.length - 4);
      const maxScore = 5;
      const chartH   = 80;
      const chartY   = y;

      moodHistory.slice(-14).forEach((entry, i) => {
        const score  = entry.score || 3;
        const barH   = (score / maxScore) * chartH;
        const x      = 50 + i * (barW + 4);
        const barY   = chartY + chartH - barH;

        // Barre
        fillColor(moodColor(score));
        doc.roundedRect(x, barY, barW, barH, 3).fill();

        // Score
        fillColor(COLORS.dark);
        doc.fontSize(8).font('Helvetica-Bold').text(score.toString(), x + barW / 2 - 4, barY - 12);

        // Date courte
        if (entry.date) {
          const d = new Date(entry.date);
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          fillColor(COLORS.muted);
          doc.fontSize(7).font('Helvetica').text(label, x, chartY + chartH + 4, { width: barW + 4, align: 'center' });
        }
      });

      // Légende
      y = chartY + chartH + 22;
      const legendItems = [
        { color: '#2ECC71', label: 'Bien (4-5)' },
        { color: '#F5B731', label: 'Neutre (3)' },
        { color: '#E74C3C', label: 'Difficile (1-2)' },
      ];
      legendItems.forEach((l, i) => {
        fillColor(l.color);
        doc.rect(50 + i * 110, y, 12, 12).fill();
        fillColor(COLORS.muted);
        doc.fontSize(9).font('Helvetica').text(l.label, 66 + i * 110, y + 1);
      });
      y += 20;

      // Calcul moyenne
      const avg = (moodHistory.reduce((s, e) => s + (e.score || 3), 0) / moodHistory.length).toFixed(1);
      fillColor(COLORS.dark);
      doc.fontSize(11).font('Helvetica-Bold')
         .text(`Humeur moyenne : ${avg}/5 — ${moodLabel(Math.round(avg))}`, 50, y + 6);
      y += 26;
    }

    // ── DÉFIS ─────────────────────────────────────────────────────────────────
    checkPageBreak(120);
    y = sectionTitle('🎯 Défis récents', doc.y + 12);

    if (!challenges || challenges.length === 0) {
      fillColor(COLORS.muted);
      doc.fontSize(11).font('Helvetica-Oblique').text('Aucun défi complété pour l\'instant.', 50, y);
      y += 24;
    } else {
      const recent = challenges.slice(-10);
      const colW = (W - 10) / 2;
      recent.forEach((ch, i) => {
        checkPageBreak(36);
        const x = 50 + (i % 2) * (colW + 10);
        if (i % 2 === 0 && i > 0) doc.y += 4;

        const cy = i % 2 === 0 ? doc.y : doc.y;
        fillColor(COLORS.bg);
        doc.roundedRect(x, cy, colW, 30, 6).fill();

        doc.fontSize(14).text('✅', x + 6, cy + 7);
        fillColor(COLORS.dark);
        doc.fontSize(10).font('Helvetica-Bold')
           .text(ch.challenge?.title || ch.title || 'Défi', x + 28, cy + 6, { width: colW - 36 });
        fillColor(COLORS.muted);
        doc.fontSize(8).font('Helvetica')
           .text(`+${ch.pointsEarned || 10} pts`, x + 28, cy + 18);

        if (i % 2 === 1) doc.y += 34;
      });
      if (recent.length % 2 !== 0) doc.y += 34;
      y = doc.y;
    }

    // ── BADGES ────────────────────────────────────────────────────────────────
    checkPageBreak(80);
    y = sectionTitle('🏆 Badges obtenus', doc.y + 12);

    const earnedBadges = badges.filter(b => b.earned);
    if (earnedBadges.length === 0) {
      fillColor(COLORS.muted);
      doc.fontSize(11).font('Helvetica-Oblique').text('Aucun badge débloqué pour l\'instant.', 50, doc.y);
      doc.y += 24;
    } else {
      earnedBadges.forEach((b, i) => {
        checkPageBreak(28);
        const x = 50 + (i % 3) * ((W / 3) + 4);
        const cy = doc.y;
        doc.fontSize(16).text(b.icon || '🏅', x, cy);
        fillColor(COLORS.dark);
        doc.fontSize(10).font('Helvetica-Bold').text(b.name || '', x + 22, cy + 2);
        if (i % 3 === 2) doc.y += 26;
      });
      doc.y += 26;
    }

    // ── CONSEIL IA ────────────────────────────────────────────────────────────
    checkPageBreak(100);
    doc.y += 8;
    y = sectionTitle('💡 Conseil personnalisé', doc.y + 4);

    fillColor(COLORS.primary);
    doc.roundedRect(50, doc.y, W, 60, 10).fill();
    doc.fillColor('white').fontSize(11).font('Helvetica')
       .text(conseil, 66, doc.y - 52, { width: W - 32, lineGap: 4 });
    doc.y += 20;

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footerY = pageH - 40;
    strokeColor(COLORS.divider);
    doc.moveTo(50, footerY).lineTo(50 + W, footerY).lineWidth(0.5).stroke();
    fillColor(COLORS.muted);
    doc.fontSize(9).font('Helvetica')
       .text('LinkMind — Ton espace bien-être · Ce rapport est confidentiel', 50, footerY + 8,
             { align: 'center', width: W });

    doc.end();
  });
};

module.exports = { generateReport };