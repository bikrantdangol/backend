const PDFDocument = require("pdfkit");

const drawSummaryBoxes = (doc, summary, startY) => {
  const boxW = 98;
  const boxH = 45;
  const gap = 8;
  const x0 = 40;
  const labels = [
    ["Total", summary?.totalDays || 0],
    ["Present", summary?.presentDays || 0],
    ["Late", summary?.lateDays || 0],
    ["Absent", summary?.absentDays || 0],
    ["Leave", summary?.leaveDays || 0],
  ];

  labels.forEach(([label, value], index) => {
    const x = x0 + index * (boxW + gap);
    doc
      .roundedRect(x, startY, boxW, boxH, 6)
      .fillAndStroke("#f3f4f6", "#d1d5db");
    doc
      .fillColor("#1a3c5e")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(label, x + 8, startY + 8);
    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(String(value), x + 8, startY + 22);
  });

  return { boxH };
};

const addDailyRecordsTable = (doc, records, startY) => {
  const headers = ["Date", "Employee", "Status", "In", "Out"];
  const colPositions = [40, 125, 320, 405, 480];
  let y = startY;

  doc.fontSize(14).fillColor("#1a3c5e").text("Daily Records", 40, y);
  doc
    .moveTo(40, y + 16)
    .lineTo(555, y + 16)
    .strokeColor("#2563eb")
    .lineWidth(1)
    .stroke();
  y += 24;

  doc.rect(40, y, 515, 18).fill("#1a3c5e");
  doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
  headers.forEach((header, i) => doc.text(header, colPositions[i], y + 4));
  y += 18;

  (records || []).forEach((record, index) => {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    const bg = index % 2 === 0 ? "white" : "#f3f4f6";
    doc.rect(40, y, 515, 16).fill(bg);
    doc.fillColor("#333").fontSize(8).font("Helvetica");
    doc.text(record.date || "-", colPositions[0], y + 3);
    doc.text(
      record.userName || record.employee || "-",
      colPositions[1],
      y + 3,
      { width: 185, ellipsis: true },
    );
    doc.text(record.status || "-", colPositions[2], y + 3);
    doc.text(record.checkIn || record.inTime || "-", colPositions[3], y + 3);
    doc.text(record.checkOut || record.outTime || "-", colPositions[4], y + 3);
    y += 16;
  });
};

const addEmployeeSummaryTable = (doc, employees) => {
  const tableTop = doc.y + 10;

  doc.fontSize(14).fillColor("#1a3c5e").text("Employee Summary", 40, tableTop);
  doc
    .moveTo(40, tableTop + 16)
    .lineTo(555, tableTop + 16)
    .strokeColor("#2563eb")
    .lineWidth(1)
    .stroke();

  const headers = ["Employee", "Role", "Present", "Late", "Absent"];
  const colPositions = [40, 160, 300, 390, 470];
  let rowY = tableTop + 25;

  // Header row
  doc.rect(40, rowY, 515, 18).fill("#1a3c5e");
  doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
  headers.forEach((h, i) => doc.text(h, colPositions[i], rowY + 4));
  rowY += 18;

  // Data rows
  employees.forEach((emp, idx) => {
    const bg = idx % 2 === 0 ? "white" : "#f3f4f6";
    doc.rect(40, rowY, 515, 16).fill(bg);
    doc.fillColor("#333").fontSize(8).font("Helvetica");
    doc.text(emp.fullName, colPositions[0], rowY + 3);
    doc.text(emp.role, colPositions[1], rowY + 3);
    doc.text(String(emp.present), colPositions[2], rowY + 3);
    doc.text(String(emp.late), colPositions[3], rowY + 3);
    doc.text(String(emp.absent), colPositions[4], rowY + 3);
    rowY += 16;
  });

  doc.moveDown(2);
  return rowY;
};

/**
 * Generate attendance report PDF and return the PDF buffer.
 * @param {object} reportData - Report data object
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateAttendanceReportPDF = async (reportData) => {
  const { user, period, summary, records } = reportData;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer); // ← return the buffer directly
    });
    doc.on("error", reject);

    // Header
    doc
      .fillColor("#1a3c5e")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Attendance Report", 40, 40);
    doc
      .moveTo(40, 66)
      .lineTo(555, 66)
      .strokeColor("#2563eb")
      .lineWidth(1.2)
      .stroke();

    doc.fillColor("#111827").font("Helvetica").fontSize(10);
    doc.text(`Name: ${user?.fullName || "N/A"}`, 40, 78);
    doc.text(`Role: ${user?.role || "N/A"}`, 40, 93);
    doc.text(`Email: ${user?.email || "N/A"}`, 40, 108);
    doc.text(`Period: ${period || "N/A"}`, 40, 123);

    // Overall summary boxes
    const sumBoxY = 150;
    const { boxH } = drawSummaryBoxes(doc, summary, sumBoxY);

    // Employee Summary Table (new)
    const employeeSummary = reportData.employees || [];
    let tableY = sumBoxY + boxH + 25;
    if (employeeSummary.length > 0) {
      doc.y = tableY;
      tableY = addEmployeeSummaryTable(doc, employeeSummary) + 10;
    }

    // Daily Records table follows...
    addDailyRecordsTable(doc, records, tableY);

    doc.end();
  });
};

module.exports = { generateAttendanceReportPDF };
