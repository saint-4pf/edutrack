// controllers/pdfController.js
const PDFDocument  = require('pdfkit');
const path         = require('path');
const Score        = require('../models/Score');
const TermSettings = require('../models/TermSettings');

// ── AUTO-GENERATE CLASS TEACHER'S REMARK ──────
function generateTeacherRemark(average, rank) {
  if (average >= 90) return `${rank === 1 ? 'Top of the class! ' : ''}An outstanding performance. Keep up the excellent work!`;
  if (average >= 80) return `${rank <= 3 ? 'Among the best in class. ' : ''}A commendable performance. Keep pushing for excellence!`;
  if (average >= 70) return 'A good performance this term. With more effort, even better results are achievable.';
  if (average >= 60) return 'A fair performance. There is room for improvement. More dedication is encouraged.';
  if (average >= 50) return 'An average performance. The student needs to work harder and be more focused.';
  if (average >= 40) return 'A below average performance. Serious effort and commitment are needed next term.';
  return 'A poor performance this term. The student requires urgent attention and support to improve.';
}

// ── AUTO-GENERATE HEADMASTER'S REMARK ─────────
function generateHeadRemark(average, rank) {
  if (average >= 90 && rank === 1) return 'An exemplary student. A pride of the school. Well done!';
  if (average >= 90) return 'Excellent academic achievement. The school is proud of you. Keep it up!';
  if (average >= 80 && rank <= 3) return 'A brilliant performance. You are among the best. Keep striving!';
  if (average >= 80) return 'Very good performance. Your hard work is paying off. Keep it up!';
  if (average >= 70) return 'Good performance. Continue to work hard and you will achieve even more.';
  if (average >= 60) return 'A satisfactory performance. More effort is needed to reach your full potential.';
  if (average >= 50) return 'You can do better. Stay focused, work harder, and seek help where needed.';
  return 'The student must improve significantly. Parents are advised to provide support at home.';
}

const generateReportPDF = async (req, res) => {
  try {
    const { studentId, term, session, noOnRoll, termCloses, nextTerm, totalDays } = req.body;

    // ── FETCH SCORES ──────────────────────────
    const scoreQuery = { studentId, teacherId: req.user._id };
    if (term)    scoreQuery.term    = term;
    if (session) scoreQuery.session = session;

    let scores = await Score.find(scoreQuery).sort({ subjectName: 1 });

    // Fallback: find without term/session filter
    if (!scores.length) {
      scores = await Score.find({ studentId, teacherId: req.user._id }).sort({ subjectName: 1 });
    }

    if (!scores.length) {
      return res.status(404).json({ success: false, message: 'No scores found for this student.' });
    }

    // ── s0 MUST BE DECLARED BEFORE ANYTHING THAT USES IT ──
    const s0         = scores[0];
    const actualTerm = term || s0.term || 'N/A';

    // ── FETCH TERM SETTINGS (fallback chain) ─────────────
    let termSettings = null;
    if (term && session) termSettings = await TermSettings.findOne({ term, session, teacherId: req.user._id });
    if (!termSettings && term) termSettings = await TermSettings.findOne({ term, teacherId: req.user._id });
    if (!termSettings && s0.term) termSettings = await TermSettings.findOne({ term: s0.term, teacherId: req.user._id });
    if (!termSettings) termSettings = await TermSettings.findOne({ teacherId: req.user._id });

    // ── TERM DATA: prefer req.body (sent from frontend localStorage), fallback to DB ──
    const finalTotalDays  = totalDays  || termSettings?.totalDays  || termSettings?.schoolDays || 'N/A';
    const finalTermCloses = termCloses || termSettings?.termCloses  || termSettings?.closes     || 'N/A';
    const finalNextTerm   = nextTerm   || termSettings?.nextResumption || termSettings?.resumes || 'N/A';
    const finalNoOnRoll   = noOnRoll   || termSettings?.noOnRoll    || termSettings?.roll       || 'N/A';

    const attendance = `${s0.daysPresent ?? 'N/A'} out of ${finalTotalDays} days`;
    const conduct    = s0.conduct  || 'N/A';
    const interest   = s0.interest || 'N/A';

    // ── CALCULATE TOTALS & RANK ───────────────
    const grandTotal = scores.reduce((sum, s) => sum + s.total, 0);
    const average    = parseFloat((grandTotal / scores.length).toFixed(1));

    let classScores = await Score.find({
      className: s0.className,
      teacherId: req.user._id,
      ...(term ? { term } : {})
    });
    if (!classScores.length) {
      classScores = await Score.find({ className: s0.className, teacherId: req.user._id });
    }

    const studentTotals = {};
    classScores.forEach(sc => {
      if (!studentTotals[sc.studentId]) studentTotals[sc.studentId] = 0;
      studentTotals[sc.studentId] += sc.total;
    });
    const sortedTotals = Object.values(studentTotals).sort((a, b) => b - a);
    const rank         = sortedTotals.indexOf(studentTotals[studentId]) + 1;

    const teacherRemark = generateTeacherRemark(average, rank);
    const headRemark    = generateHeadRemark(average, rank);

    // ══════════════════════════════════════════
    // PDF SETUP
    // ══════════════════════════════════════════
    const doc    = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
    const pageW  = doc.page.width;
    const margin = 50;
    const tW     = pageW - margin * 2;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename=report-${s0.studentName.replace(/ /g, '-')}.pdf`);
    doc.pipe(res);

    // ── HEADER ────────────────────────────────
    const logoPath = path.join(__dirname, '../assets/logo.png');
    try { doc.image(logoPath, margin, 30, { width: 70, height: 70 }); } catch (_) {}

  doc.fontSize(20).font('Helvetica-Bold')
   .text(process.env.SCHOOL_NAME || 'SCHOOL NAME', margin + 85, 32);
doc.fontSize(9).font('Helvetica')
   .text(process.env.SCHOOL_POBOX    || '', margin + 85, 58)
   .text(process.env.SCHOOL_ADDRESS  || '', margin + 85, 70)
   .text(`Tel: ${process.env.SCHOOL_PHONES || ''}`, margin + 85, 82);

    doc.moveTo(margin, 112).lineTo(pageW - margin, 112).lineWidth(2).stroke();

    // ── TITLE ─────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold')
       .text('ACADEMIC REPORT SHEET', margin, 122,
             { align: 'center', width: tW, underline: true });

    doc.moveTo(margin, 142).lineTo(pageW - margin, 142).lineWidth(1).stroke();

    // ── TWO-COLUMN STUDENT INFO BOX ───────────
    const boxY     = 152;
    const boxH     = 100;
    const col1X    = margin + 8;
    const col2X    = pageW / 2 + 10;
    const lh       = 22;
    const leftColW  = pageW / 2 - margin - 16;
    const rightColW = pageW / 2 - 20;

    doc.rect(margin, boxY, tW, boxH).stroke();
    doc.moveTo(pageW / 2, boxY).lineTo(pageW / 2, boxY + boxH).stroke();

    const leftInfo = [
      ['Name',       s0.studentName],
      ['Class',      s0.className],
      ['Attendance', attendance],
    ];
    const rightInfo = [
      ['No. on Roll', finalNoOnRoll],
      ['Term',        actualTerm],
      ['Term Closes', finalTermCloses],
      ['Next Term',   finalNextTerm],
    ];

    leftInfo.forEach(([label, value], i) => {
      const y = boxY + 10 + i * lh;
      doc.fontSize(10).font('Helvetica-Bold')
         .text(`${label}: `, col1X, y, { continued: true, width: leftColW })
         .font('Helvetica').text(value, { width: leftColW });
    });

    rightInfo.forEach(([label, value], i) => {
      const y = boxY + 10 + i * lh;
      doc.fontSize(10).font('Helvetica-Bold')
         .text(`${label}: `, col2X, y, { continued: true, width: rightColW })
         .font('Helvetica').text(value, { width: rightColW });
    });

    // ── SCORES TABLE ──────────────────────────
    const tableTop = boxY + boxH + 14;
    const rowH     = 20;

    const cols = [
      { label: 'SUBJECT',    x: margin,       w: 160 },
      { label: 'SBA (/50)',  x: margin + 160, w: 75  },
      { label: 'EXAM (/50)', x: margin + 235, w: 75  },
      { label: 'TOTAL (%)',  x: margin + 310, w: 75  },
      { label: 'REMARKS',   x: margin + 385, w: tW - 385 },
    ];

    doc.rect(margin, tableTop, tW, rowH).fill('#1a1a2e');
    cols.forEach(col => {
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
         .text(col.label, col.x + 4, tableTop + 6, { width: col.w - 4 });
    });

    const getGrade = (total) => {
      if (total >= 90) return 'HIGHLY PROFICIENT';
      if (total >= 80) return 'HIGHLY PROFICIENT';
      if (total >= 70) return 'PROFICIENT';
      if (total >= 60) return 'APPROACHING PROFICIENCY';
      if (total >= 50) return 'AVERAGE';
      if (total >= 40) return 'BELOW AVERAGE';
      if (total >= 30) return 'POOR';
      return 'FAIL';
    };

    scores.forEach((s, i) => {
      const rowY = tableTop + rowH + i * rowH;
      doc.rect(margin, rowY, tW, rowH).fill(i % 2 === 0 ? '#f5f5f5' : '#ffffff');
      doc.fillColor('black').fontSize(9).font('Helvetica');
      const values = [s.subjectName, s.sbaScore, s.examScore, s.total, getGrade(s.total)];
      cols.forEach((col, ci) => {
        doc.text(String(values[ci]), col.x + 4, rowY + 6, { width: col.w - 4 });
      });
    });

    // Grand total row
    const gtY = tableTop + rowH + scores.length * rowH;
    doc.rect(margin, gtY, tW, rowH).fill('#cccccc');
    doc.fillColor('black').fontSize(10).font('Helvetica-Bold')
       .text('GRAND TOTAL',      margin + 4,   gtY + 5)
       .text(String(grandTotal), margin + 310, gtY + 5)
       .text(`${average}%`,      margin + 385, gtY + 5);

    // ── CONDUCT & INTEREST ────────────────────
    let curY = gtY + rowH + 16;

    doc.fontSize(10).font('Helvetica-Bold')
       .text('Conduct: ', margin, curY, { continued: true })
       .font('Helvetica').text(conduct, { width: tW });

    curY += 18;
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Interest: ', margin, curY, { continued: true })
       .font('Helvetica').text(interest, { width: tW });

    // ── CLASS TEACHER'S REMARKS BOX ───────────
    curY += 24;
    const remarkBoxH = 50;
    doc.rect(margin, curY, tW, remarkBoxH).stroke();
    doc.fontSize(10).font('Helvetica-Bold')
       .text("Class Teacher's Remarks:", margin + 6, curY + 6);
    doc.fontSize(10).font('Helvetica')
       .text(teacherRemark, margin + 6, curY + 20, { width: tW - 12 });

    // ── HEADMASTER'S REMARKS BOX ──────────────
    curY += remarkBoxH + 10;
    doc.rect(margin, curY, tW, remarkBoxH).stroke();
    doc.fontSize(10).font('Helvetica-Bold')
       .text("Headmaster's Remarks:", margin + 6, curY + 6);
    doc.fontSize(10).font('Helvetica')
       .text(headRemark, margin + 6, curY + 20, { width: tW - 12 });

    // ── SIGNATURES ────────────────────────────
    curY += remarkBoxH + 30;
    const sigLineW = 180;

    doc.moveTo(margin, curY)
       .lineTo(margin + sigLineW, curY).lineWidth(1).stroke();
    doc.moveTo(pageW - margin - sigLineW, curY)
       .lineTo(pageW - margin, curY).stroke();

    doc.fontSize(9).font('Helvetica')
       .text("Class Teacher's Signature", margin,                     curY + 5)
       .text("Head Teacher's Signature",  pageW - margin - sigLineW, curY + 5);

    // ── FOOTER ────────────────────────────────
    curY += 35;
    doc.fontSize(10).font('Helvetica-Bold')
       .text(`School resumes on ${finalNextTerm} for the next term.`,
             margin, curY, { align: 'center', width: tW });

    // ══════════════════════════════════════════
    // PAGE 2 — GRADING KEY
    // ══════════════════════════════════════════
    doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold')
       .text('GRADING KEY', margin, 50, { align: 'center', width: tW, underline: true });

    doc.moveTo(margin, 72).lineTo(pageW - margin, 72).lineWidth(1).stroke();

    const grades = [
      ['90 - 100', 'A+', 'HIGHLY PROFICIENT'],
      ['80 - 89',  'A',  'HIGHLY PROFICIENT'],
      ['70 - 79',  'B',  'PROFICIENT'],
      ['60 - 69',  'C',  'APPROACHING PROFICIENCY'],
      ['50 - 59',  'C-', 'AVERAGE'],
      ['40 - 49',  'D',  'BELOW AVERAGE'],
      ['30 - 39',  'E',  'POOR'],
      ['0  - 29',  'F',  'FAIL'],
    ];

    const gCols = [
      { label: 'SCORE RANGE', x: margin,       w: 120 },
      { label: 'GRADE',       x: margin + 120, w: 80  },
      { label: 'REMARK',      x: margin + 200, w: 300 },
    ];

    const gTop  = 82;
    const gRowH = 24;

    doc.rect(margin, gTop, tW, gRowH).fill('#1a1a2e');
    gCols.forEach(col => {
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text(col.label, col.x + 6, gTop + 7, { width: col.w - 6 });
    });

    grades.forEach(([range, grade, remark], i) => {
      const gy = gTop + gRowH + i * gRowH;
      doc.rect(margin, gy, tW, gRowH).fill(i % 2 === 0 ? '#f5f5f5' : '#ffffff');
      doc.fillColor('black').fontSize(10).font('Helvetica');
      [range, grade, remark].forEach((val, ci) => {
        doc.text(val, gCols[ci].x + 6, gy + 7, { width: gCols[ci].w - 6 });
      });
    });

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateReportPDF };