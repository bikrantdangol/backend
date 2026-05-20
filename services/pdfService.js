const PDFDocument = require("pdfkit");

/**
 * Generate official attendance report PDF (landscape A4, formal letterhead)
 * @param {object} reportData
 * @param {object} reportData.user           - { fullName, role, email }
 * @param {string} reportData.period         - e.g. "Jestha 2083"
 * @param {object} reportData.summary        - { totalDays, presentDays, lateDays, absentDays, ... }
 * @param {Array}  reportData.employees      - [{ fullName, role, present, late, absent }]
 * @param {Array}  reportData.records        - [{ nepaliDate, checkIn, checkOut, status, userName }]
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateAttendanceReportPDF = async (reportData) => {
  const { user, period, summary, employees, records } = reportData;

  return new Promise((resolve, reject) => {
    // Landscape A4 with 40pt margins
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", reject);

    // Helpers
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const centerX = left + pageWidth / 2;

    // ─── Formal Letterhead Header ──────────────────────────────────
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1a2b4c")
      .text(
        "Mirmire Saving & Credit Co-operative Ltd.",
        left,
        doc.page.margins.top,
        { align: "center", width: pageWidth },
      );
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333")
      .text("Tokha, Saraswati-2, Kathmandu", {
        align: "center",
        width: pageWidth,
      });
    doc.text("Tel: 01-5110048", { align: "center", width: pageWidth });
    doc.moveDown(0.3);

    // Horizontal divider
    const dividerY = doc.y;
    doc
      .moveTo(left, dividerY)
      .lineTo(left + pageWidth, dividerY)
      .strokeColor("#1a2b4c")
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.3);

    // Report title
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#1a2b4c")
      .text("Attendance Report", { align: "center", width: pageWidth });
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#333")
      .text(`Period: ${period}`, { align: "center", width: pageWidth });
    doc.moveDown(0.3);

    // Optional plain-text summary line (no boxes, no cards)
    if (summary) {
      const summaryText = `Total Days: ${summary.totalDays || 0} | Present: ${summary.presentDays || 0} | Late: ${summary.lateDays || 0} | Absent: ${summary.absentDays || 0}`;
      doc
        .fontSize(9)
        .fillColor("#555")
        .text(summaryText, { align: "center", width: pageWidth });
      doc.moveDown(0.5);
    }

    // ─── Employee Summary Table ──────────────────────────────────
    if (employees && employees.length > 0) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a2b4c")
        .text("Employee Summary");
      doc.moveDown(0.2);

      const tableTop = doc.y;
      const col1 = left;
      const col2 = col1 + 220; // Employee
      const col3 = col2 + 130; // Role
      const col4 = col3 + 90; // Present
      const col5 = col4 + 90; // Late
      const col6 = col5 + 90; // Absent
      const rowHeight = 18;
      const headerHeight = 20;

      // Table header
      doc.rect(col1, tableTop, pageWidth, headerHeight).fill("#1a2b4c");
      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
      doc.text("Employee", col1 + 5, tableTop + 4, {
        width: col2 - col1 - 10,
        ellipsis: true,
      });
      doc.text("Role", col2 + 5, tableTop + 4, { width: col3 - col2 - 10 });
      doc.text("Present", col4, tableTop + 4, {
        width: col5 - col4,
        align: "center",
      });
      doc.text("Late", col5, tableTop + 4, {
        width: col6 - col5,
        align: "center",
      });
      doc.text("Absent", col6, tableTop + 4, {
        width: left + pageWidth - col6,
        align: "center",
      });

      let y = tableTop + headerHeight;
      employees.forEach((emp, idx) => {
        const bgColor = idx % 2 === 0 ? "#ffffff" : "#f3f4f6";
        doc.rect(col1, y, pageWidth, rowHeight).fill(bgColor);
        doc.fillColor("#333").fontSize(8).font("Helvetica");
        doc.text(emp.fullName || "", col1 + 5, y + 3, {
          width: col2 - col1 - 10,
          ellipsis: true,
        });
        doc.text(emp.role || "", col2 + 5, y + 3, { width: col3 - col2 - 10 });
        doc.text(String(emp.present || 0), col4, y + 3, {
          width: col5 - col4,
          align: "center",
        });
        doc.text(String(emp.late || 0), col5, y + 3, {
          width: col6 - col5,
          align: "center",
        });
        doc.text(String(emp.absent || 0), col6, y + 3, {
          width: left + pageWidth - col6,
          align: "center",
        });
        y += rowHeight;

        // New page if necessary
        if (y > doc.page.height - 60) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 40 });
          y = doc.page.margins.top;
          // Repeat header on new page
          doc.rect(col1, y, pageWidth, headerHeight).fill("#1a2b4c");
          doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
          doc.text("Employee", col1 + 5, y + 4, { width: col2 - col1 - 10 });
          doc.text("Role", col2 + 5, y + 4, { width: col3 - col2 - 10 });
          doc.text("Present", col4, y + 4, {
            width: col5 - col4,
            align: "center",
          });
          doc.text("Late", col5, y + 4, {
            width: col6 - col5,
            align: "center",
          });
          doc.text("Absent", col6, y + 4, {
            width: left + pageWidth - col6,
            align: "center",
          });
          y += headerHeight;
        }
      });

      doc.y = y + 10;
    }

    // ─── Daily Records Table ────────────────────────────────────
    if (records && records.length > 0) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a2b4c")
        .text("Daily Records");
      doc.moveDown(0.2);

      const tableTop = doc.y;
      const col1 = left;
      const col2 = col1 + 90; // Date (BS)
      const col3 = col2 + 180; // Employee
      const col4 = col3 + 110; // Check In
      const col5 = col4 + 110; // Check Out
      const col6 = col5 + 100; // Status
      const rowHeight = 18;
      const headerHeight = 20;

      // Table header
      doc.rect(col1, tableTop, pageWidth, headerHeight).fill("#1a2b4c");
      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
      doc.text("Date (BS)", col1 + 5, tableTop + 4, {
        width: col2 - col1 - 10,
      });
      doc.text("Employee", col2 + 5, tableTop + 4, { width: col3 - col2 - 10 });
      doc.text("Check In", col4, tableTop + 4, {
        width: col5 - col4,
        align: "center",
      });
      doc.text("Check Out", col5, tableTop + 4, {
        width: col6 - col5,
        align: "center",
      });
      doc.text("Status", col6, tableTop + 4, {
        width: left + pageWidth - col6,
        align: "center",
      });

      let y = tableTop + headerHeight;
      records.forEach((rec, idx) => {
        const bgColor = idx % 2 === 0 ? "#ffffff" : "#f3f4f6";
        doc.rect(col1, y, pageWidth, rowHeight).fill(bgColor);
        doc.fillColor("#333").fontSize(8).font("Helvetica");

        doc.text(rec.nepaliDate || "-", col1 + 5, y + 3, {
          width: col2 - col1 - 10,
        });
        doc.text(rec.userName || "-", col2 + 5, y + 3, {
          width: col3 - col2 - 10,
          ellipsis: true,
        });

        const ci = rec.checkIn
          ? new Date(rec.checkIn).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "-";
        const co = rec.checkOut
          ? new Date(rec.checkOut).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "-";
        doc.text(ci, col4, y + 3, { width: col5 - col4, align: "center" });
        doc.text(co, col5, y + 3, { width: col6 - col5, align: "center" });

        const status = rec.status
          ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1)
          : "-";
        doc.text(status, col6, y + 3, {
          width: left + pageWidth - col6,
          align: "center",
        });

        y += rowHeight;

        if (y > doc.page.height - 60) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 40 });
          y = doc.page.margins.top;
          // Repeat header on new page
          doc.rect(col1, y, pageWidth, headerHeight).fill("#1a2b4c");
          doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
          doc.text("Date (BS)", col1 + 5, y + 4, { width: col2 - col1 - 10 });
          doc.text("Employee", col2 + 5, y + 4, { width: col3 - col2 - 10 });
          doc.text("Check In", col4, y + 4, {
            width: col5 - col4,
            align: "center",
          });
          doc.text("Check Out", col5, y + 4, {
            width: col6 - col5,
            align: "center",
          });
          doc.text("Status", col6, y + 4, {
            width: left + pageWidth - col6,
            align: "center",
          });
          y += headerHeight;
        }
      });

      doc.y = y + 10;
    }

    // ─── Footer ──────────────────────────────────────────────────
    doc
      .fontSize(7)
      .fillColor("#888")
      .text(
        `Generated on ${new Date().toLocaleDateString()} by Finance Institute HRMS`,
        { align: "center", width: pageWidth },
      );

    doc.end();
  });
};

module.exports = { generateAttendanceReportPDF };