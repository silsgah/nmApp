/**
 * PDF Report Generator for Student Results
 * Uses pdfkit to output a highly polished, professional-grade result slip.
 */

/**
 * Generates a neat result slip PDF buffer for a student result.
 *
 * @param {object} result - StudentResult with student and session included
 * @returns {Buffer} PDF buffer
 */
export async function generateResultPdf(result) {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Result Slip — ${result.student.name}`,
        Author: 'NM Practical Portal',
        Subject: 'Clinical Practical Examination Result',
        Creator: 'GAFCONM NM Portal',
      },
    });

    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Colour palette ──
    const INDIGO = '#1e1b4b';
    const ACCENT = '#4f46e5';
    const TEAL   = '#0d9488';
    const DARK   = '#0f172a';
    const MUTED  = '#64748b';
    const GREEN  = '#0f766e'; // teal-deep
    const RED    = '#b91c1c';
    const AMBER  = '#d97706';
    const LIGHT  = '#f8fafc';
    const BORDER = '#e2e8f0';

    const PAGE_W = doc.page.width;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // ── Top Header Banner ──
    doc.rect(0, 0, PAGE_W, 90).fill(INDIGO);

    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('GAFCONM', MARGIN, 24, { align: 'left' });

    doc.fillColor('#94a3b8')
      .font('Helvetica')
      .fontSize(8.5)
      .text('Ghana Armed Forces College of Nursing & Midwifery', MARGIN, 45, { align: 'left' });

    doc.fillColor('#c7d2fe')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text('CLINICAL PRACTICAL EXAMINATION RESULT SLIP', MARGIN, 58, { align: 'left' });

    // Pass/Fail Pill in top-right
    const badgeColor = result.passed ? '#0f766e' : '#be123c';
    const badgeText  = result.passed ? 'PASS' : 'FAIL';
    doc.roundedRect(PAGE_W - MARGIN - 80, 22, 80, 48, 6).fill(badgeColor);
    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(badgeText, PAGE_W - MARGIN - 80, 29, { width: 80, align: 'center' });
    doc.fillColor('#e2e8f0')
      .font('Helvetica')
      .fontSize(8)
      .text(`Grade: ${result.grade}`, PAGE_W - MARGIN - 80, 52, { width: 80, align: 'center' });

    let y = 108;

    // ── Student Info Box with Photograph ──
    doc.lineWidth(1.2).roundedRect(MARGIN, y, CONTENT_W, 76, 8).fill(LIGHT).stroke(BORDER);

    // Left Column Info
    const infoLeft  = MARGIN + 15;
    const infoRight = MARGIN + 210;

    const renderField = (label, val, x, yPos) => {
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x, yPos);
      doc.fillColor(DARK).font('Helvetica').fontSize(9.5).text(val || '—', x, yPos + 10);
    };

    renderField('Student Name',  result.student.name, infoLeft, y + 10);
    renderField('Index Number',  result.student.staffId ?? '—', infoLeft, y + 42);

    renderField('Session',       result.session?.name ?? 'N/A', infoRight, y + 10);
    renderField('Programme',     result.session?.programme?.name ?? result.student.programme?.name ?? 'N/A', infoRight, y + 42);

    // Photograph on right
    const photoX = PAGE_W - MARGIN - 60 - 12;
    const photoY = y + 8;

    const drawFallbackPhoto = () => {
      doc.roundedRect(photoX, photoY, 60, 60, 6).fill('#cbd5e1');
      const initials = result.student.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'ST';
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(14).text(initials, photoX, photoY + 22, { width: 60, align: 'center' });
    };

    if (result.student.profilePictureUrl) {
      try {
        const base64Data = result.student.profilePictureUrl.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.roundedRect(photoX - 1, photoY - 1, 62, 62, 6).lineWidth(1).stroke('#cbd5e1');
        doc.image(imgBuffer, photoX, photoY, { width: 60, height: 60 });
      } catch {
        drawFallbackPhoto();
      }
    } else {
      drawFallbackPhoto();
    }

    y += 94;

    // ── Overall Score Dashboard ──
    const scoreBoxColor = result.passed ? '#f0fdf4' : '#fff1f2';
    const scoreBorderColor = result.passed ? '#bbf7d0' : '#fecdd3';
    doc.lineWidth(1.2).roundedRect(MARGIN, y, CONTENT_W, 56, 8).fill(scoreBoxColor).stroke(scoreBorderColor);

    // Large Percentage
    doc.fillColor(result.passed ? '#15803d' : '#be123c')
      .font('Helvetica-Bold')
      .fontSize(28)
      .text(`${result.overallPercent?.toFixed(1) ?? 0}%`, MARGIN + 15, y + 13);

    // Scores summary
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text('OVERALL SCORE DETAILS', MARGIN + 115, y + 11);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(`Score: ${result.overallScore?.toFixed(1) ?? 0} / ${result.overallMaxScore}`, MARGIN + 115, y + 22);
    doc.fillColor(DARK).font('Helvetica').fontSize(8.5).text(`Pass Mark: ${result.session?.config?.overallPassMark ?? 50}%`, MARGIN + 115, y + 35);

    // Status Label
    doc.fillColor(result.passed ? '#15803d' : '#be123c')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(result.passed ? '✓ PASSED EXAMINATION' : '✗ DID NOT PASS', PAGE_W - MARGIN - 170, y + 21, { width: 155, align: 'right' });

    y += 74;

    // ── Category breakdown table ──
    if (result.categoryScores && Object.keys(result.categoryScores).length > 0) {
      // Vertical indicator bar and Title
      doc.rect(MARGIN, y, 4, 13).fill(ACCENT);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('Station Breakdown Details', MARGIN + 10, y);
      y += 18;

      const cols = { name: MARGIN, score: MARGIN + 210, pct: MARGIN + 300, pass: MARGIN + 370 };
      const ROW_H = 22;

      // Table Header Row
      doc.roundedRect(MARGIN, y, CONTENT_W, ROW_H, 4).fill(INDIGO);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('EXAMINATION STATION', cols.name + 10, y + 7, { width: 190 });
      doc.text('SCALED SCORE',       cols.score + 5, y + 7, { width: 85 });
      doc.text('PERCENTAGE',         cols.pct + 5,   y + 7, { width: 60 });
      doc.text('RESULT',             cols.pass + 5,  y + 7, { width: 60 });
      y += ROW_H;

      let rowIndex = 0;
      for (const cat of Object.values(result.categoryScores)) {
        const rowColor = rowIndex % 2 === 0 ? '#ffffff' : LIGHT;
        doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(rowColor).stroke(BORDER);
        const pct = (cat.percentage ?? 0).toFixed(1);
        const catPassed = cat.passed ?? (cat.percentage >= 50);

        // Show scaled score if available (e.g. 60/80 for Major), fallback to raw
        const scoreDisplay = cat.scaledScore != null
          ? `${cat.scaledScore.toFixed(1)} / ${cat.scaledMaxMarks}`
          : `${(cat.score ?? 0).toFixed(1)} / ${cat.maxScore}`;

        doc.fillColor(DARK).font('Helvetica').fontSize(9);
        doc.text(cat.categoryName,  cols.name + 10,  y + 7, { width: 190 });
        doc.text(scoreDisplay,      cols.score + 5,  y + 7, { width: 85 });
        doc.text(`${pct}%`,         cols.pct + 5,    y + 7, { width: 60 });

        doc.fillColor(catPassed ? '#0f766e' : RED)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(catPassed ? 'PASS' : 'FAIL', cols.pass + 5, y + 7, { width: 60 });

        y += ROW_H;
        rowIndex++;
      }
      y += 16;
    }

    // ── Grade scale reference ──
    if (y > 600) doc.addPage();

    doc.rect(MARGIN, y, 4, 13).fill(ACCENT);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('Academic Grading Scale', MARGIN + 10, y);
    y += 18;

    const grades = [
      { g: 'A', label: 'Distinction', range: '≥ 80%',     color: '#0f766e' },
      { g: 'B', label: 'Credit',      range: '70% – 79%', color: '#0d9488' },
      { g: 'C', label: 'Pass',        range: '60% – 69%', color: ACCENT },
      { g: 'D', label: 'Borderline',  range: '50% – 59%', color: AMBER },
      { g: 'F', label: 'Fail',        range: '< 50%',     color: RED },
    ];

    const CELL_W = (CONTENT_W - 16) / grades.length;
    for (let i = 0; i < grades.length; i++) {
      const { g, range, color } = grades[i];
      const isCurrentGrade = g === result.grade || (g === 'F' && result.grade === 'FAIL');
      const xPos = MARGIN + i * (CELL_W + 4);
      
      doc.roundedRect(xPos, y, CELL_W, 36, 4)
        .fill(isCurrentGrade ? color : '#f8fafc')
        .stroke(isCurrentGrade ? color : BORDER);
        
      doc.fillColor(isCurrentGrade ? '#ffffff' : MUTED)
        .font('Helvetica-Bold').fontSize(11)
        .text(g, xPos + 4, y + 6, { width: CELL_W - 8, align: 'center' });
        
      doc.fillColor(isCurrentGrade ? '#ffffff' : MUTED)
        .font('Helvetica').fontSize(7.5)
        .text(range, xPos + 4, y + 21, { width: CELL_W - 8, align: 'center' });
    }
    y += 54;

    // ── Signature and Stamps Section ──
    const sigY = y + 10;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8.5).text('ISSUED BY:', MARGIN, sigY);
    doc.font('Helvetica').fontSize(8).text('.........................................................................', MARGIN, sigY + 28);
    doc.font('Helvetica-Bold').fontSize(8.5).text('HEAD OF ACADEMIC AFFAIRS / REGISTRAR', MARGIN, sigY + 40);

    // Official Stamp placeholder
    const stampX = PAGE_W - MARGIN - 180;
    doc.roundedRect(stampX, sigY, 180, 56, 6).dash(4, { space: 2 }).stroke(BORDER);
    doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8).text('OFFICIAL COLLEGE STAMP / SEAL', stampX, sigY + 20, { width: 180, align: 'center' });
    doc.font('Helvetica').fontSize(7).text('(Not valid unless stamped)', stampX, sigY + 32, { width: 180, align: 'center' });

    // ── Footer ──
    const footerY = doc.page.height - 60;
    doc.rect(0, footerY - 8, PAGE_W, 1).fill(BORDER);

    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text(`Generated: ${new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`, MARGIN, footerY);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text('NM Practical Examination Portal — GAFCONM', 0, footerY, { align: 'center', width: PAGE_W });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text('This is a computer-generated document.', 0, footerY + 12, { align: 'center', width: PAGE_W });

    // Watermark for not-published
    if (result.status !== 'PUBLISHED') {
      doc.save();
      doc.opacity(0.06).rotate(-45, { origin: [PAGE_W / 2, doc.page.height / 2] });
      doc.fillColor(RED).font('Helvetica-Bold').fontSize(80)
        .text('DRAFT', 80, doc.page.height / 2 - 60);
      doc.restore();
    }

    doc.end();
  });
}

/**
 * Generates an official, production-grade PDF broadsheet report of all student results for a session.
 *
 * @param {object} session - ExamSession details
 * @param {array} results - StudentResults list
 * @returns {Buffer} PDF buffer
 */
export async function generateSessionBroadsheetPdf(session, results) {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Broadsheet — ${session.name}`,
        Author: 'NM Practical Portal',
        Subject: 'Session Results Broadsheet Report',
        Creator: 'GAFCONM NM Portal',
      },
    });

    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Color palette
    const INDIGO = '#1e1b4b';
    const ACCENT = '#4f46e5';
    const DARK   = '#0f172a';
    const MUTED  = '#64748b';
    const GREEN  = '#0f766e';
    const RED    = '#b91c1c';
    const LIGHT  = '#f8fafc';
    const BORDER = '#e2e8f0';

    const PAGE_W = doc.page.width;
    const MARGIN = 40;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // Helper to draw headers on every page
    const drawHeader = (pageNumber) => {
      // Top banner
      doc.rect(0, 0, PAGE_W, 80).fill(INDIGO);

      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('GHANA ARMED FORCES COLLEGE OF NURSING & MIDWIFERY', MARGIN, 20, { align: 'left' });

      doc.fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(8)
        .text('GAFCONM EXAMINATIONS BOARD · OFFICIAL ACADEMIC REPORT', MARGIN, 36, { align: 'left' });

      doc.fillColor('#c7d2fe')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`PRACTICAL EXAMINATION BROADSHEET REPORT — ${session.name.toUpperCase()}`, MARGIN, 48, { align: 'left' });

      doc.fillColor('#94a3b8')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`PAGE ${pageNumber}`, PAGE_W - MARGIN - 60, 20, { width: 60, align: 'right' });
    };

    let pageNum = 1;
    drawHeader(pageNum);

    let y = 92;

    // Overall summary cards
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const avgScore = total > 0 ? (results.reduce((sum, r) => sum + r.overallPercent, 0) / total).toFixed(1) : '0.0';

    // Summary boxes grid
    const colW = (CONTENT_W - 12) / 4;
    const drawStatCard = (label, val, x) => {
      doc.lineWidth(1).roundedRect(x, y, colW, 40, 6).fill(LIGHT).stroke(BORDER);
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(), x + 8, y + 8);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(14).text(val, x + 8, y + 18);
    };

    drawStatCard('Total Candidates', `${total}`, MARGIN);
    drawStatCard('Passed', `${passed}`, MARGIN + colW + 4);
    drawStatCard('Failed', `${failed}`, MARGIN + (colW + 4) * 2);
    drawStatCard('Session Pass Rate', `${passRate}%`, MARGIN + (colW + 4) * 3);

    y += 52;

    // Table Columns definition
    const cols = {
      no: MARGIN,
      name: MARGIN + 25,
      index: MARGIN + 225,
      score: MARGIN + 315,
      pct: MARGIN + 380,
      grade: MARGIN + 430,
      status: MARGIN + 475
    };

    const drawTableHeader = (yPos) => {
      doc.roundedRect(MARGIN, yPos, CONTENT_W, 20, 4).fill(INDIGO);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
      doc.text('NO.', cols.no + 5, yPos + 6);
      doc.text('STUDENT NAME', cols.name + 5, yPos + 6);
      doc.text('INDEX NO', cols.index + 5, yPos + 6);
      doc.text('MARKS', cols.score + 5, yPos + 6);
      doc.text('PERCENT', cols.pct + 5, yPos + 6);
      doc.text('GRADE', cols.grade + 5, yPos + 6);
      doc.text('OUTCOME', cols.status + 5, yPos + 6);
    };

    drawTableHeader(y);
    y += 20;

    const ROW_H = 18;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];

      // Page overflow check
      if (y > 740) {
        doc.addPage();
        pageNum++;
        drawHeader(pageNum);
        y = 92;
        drawTableHeader(y);
        y += 20;
      }

      // Zebra striping
      const bg = i % 2 === 0 ? '#ffffff' : LIGHT;
      doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(bg).stroke(BORDER);

      doc.fillColor(DARK).font('Helvetica').fontSize(8);
      doc.text(`${i + 1}`, cols.no + 5, y + 5);
      doc.font('Helvetica-Bold').text(r.student.name, cols.name + 5, y + 5);
      doc.font('Helvetica-Oblique').fillColor(MUTED).text(r.student.staffId || '—', cols.index + 5, y + 5);
      
      doc.fillColor(DARK).font('Helvetica');
      doc.text(`${r.overallScore.toFixed(1)} / ${r.overallMaxScore}`, cols.score + 5, y + 5);
      doc.text(`${r.overallPercent.toFixed(1)}%`, cols.pct + 5, y + 5);
      doc.font('Helvetica-Bold').text(r.grade || '—', cols.no + 435, y + 5);

      const passedText = r.passed ? 'PASS' : 'FAIL';
      doc.fillColor(r.passed ? GREEN : RED)
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(passedText, cols.status + 5, y + 5);

      y += ROW_H;
    }

    // Footnotes & stamps section
    if (y > 640) {
      doc.addPage();
      pageNum++;
      drawHeader(pageNum);
      y = 92;
    }

    y += 30;

    doc.rect(MARGIN, y, CONTENT_W, 1).fill(BORDER);
    y += 10;

    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8).text('ISSUED BY THE EXAMINATIONS OFFICE', MARGIN, y);
    doc.font('Helvetica').fontSize(7.5).text('.........................................................................', MARGIN, y + 22);
    doc.font('Helvetica-Bold').fontSize(8).text('REGISTRAR / PRINCIPAL', MARGIN, y + 32);

    // Official Stamp placeholder
    const stampX = PAGE_W - MARGIN - 180;
    doc.roundedRect(stampX, y, 180, 50, 4).dash(3, { space: 2 }).stroke(BORDER);
    doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(7.5).text('OFFICIAL COLLEGE STAMP / SEAL', stampX, y + 16, { width: 180, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).text('(Broadsheet Report Validation)', stampX, y + 27, { width: 180, align: 'center' });

    // Footer
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY - 8, PAGE_W, 1).fill(BORDER);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
      .text(`Generated: ${new Date().toLocaleString('en-GB')}`, MARGIN, footerY);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
      .text('NM Practical Examination Portal — Broadsheet', 0, footerY, { align: 'center', width: PAGE_W });

    // Watermark if draft
    const allPublished = results.every(r => r.status === 'PUBLISHED');
    if (!allPublished) {
      doc.save();
      doc.opacity(0.04).rotate(-45, { origin: [PAGE_W / 2, doc.page.height / 2] });
      doc.fillColor(RED).font('Helvetica-Bold').fontSize(90)
        .text('DRAFT BROADSHEET', 40, doc.page.height / 2 - 40);
      doc.restore();
    }

    doc.end();
  });
}

