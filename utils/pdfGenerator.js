const PDFDocument = require("pdfkit");
const cloudinary = require("cloudinary").v2;
const stream = require("stream");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generate attendance report PDF and upload to Cloudinary
 * @param {object} reportData - Report data object
 * @returns {Promise<string>} Cloudinary secure URL
 */
const generateAttendanceReportPDF = async (reportData) => {
  const {
    user,
    period, // e.g. "Baisakh 2081" or "Year 2081"
    summary, // { totalDays, presentDays, absentDays, lateDays, earlyLeaveDays, leaveDays, holidayDays }
    records, // array of daily attendance records
  } = reportData;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "hrms/reports",
          resource_type: "raw",
          format: "pdf",
          public_id: `attendance_${user._id}_${Date.now()}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );

      const readable = new stream.PassThrough();
      readable.end(pdfBuffer);
      readable.pipe(uploadStream);
    });

    // ─── PDF Content ───────────────────────────────────────────
    const primaryColor = "#1a3c5e";
    const accentColor = "#2563eb";
    const lightGray = "#f3f4f6";

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
    doc
      .fillColor("white")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("ATTENDANCE REPORT", 40, 25);
    doc.fontSize(11).font("Helvetica").text("Finance Institute HRMS", 40, 52);

    doc.moveDown(3);

    // User & Period Info
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Report Details", 40, 100);
    doc
      .moveTo(40, 118)
      .lineTo(555, 118)
      .strokeColor(accentColor)
      .lineWidth(1)
      .stroke();

    doc.fillColor("#333").fontSize(11).font("Helvetica");
    const infoY = 125;
    doc.text(`Employee: ${user.fullName}`, 40, infoY);
    doc.text(`Role: ${user.role}`, 300, infoY);
    doc.text(`Email: ${user.email}`, 40, infoY + 18);
    doc.text(`Period: ${period}`, 300, infoY + 18);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, infoY + 36);

    // Summary Section
    doc.moveDown(4);
    const sumY = infoY + 75;
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Summary", 40, sumY);
    doc
      .moveTo(40, sumY + 18)
      .lineTo(555, sumY + 18)
      .strokeColor(accentColor)
      .lineWidth(1)
      .stroke();

    const summaryItems = [
      {
        label: "Total Working Days",
        value: summary.totalDays,
        color: primaryColor,
      },
      { label: "Present Days", value: summary.presentDays, color: "#16a34a" },
      { label: "Absent Days", value: summary.absentDays, color: "#dc2626" },
      { label: "Late Arrivals", value: summary.lateDays, color: "#d97706" },
      {
        label: "Early Leaves",
        value: summary.earlyLeaveDays,
        color: "#9333ea",
      },
      { label: "Leave Days", value: summary.leaveDays, color: "#0891b2" },
    ];

    let sumBoxX = 40;
    const sumBoxY = sumY + 28;
    const boxW = 84;
    const boxH = 60;
    const gap = 8;

    summaryItems.forEach((item) => {
      doc.rect(sumBoxX, sumBoxY, boxW, boxH).fill(lightGray);
      doc
        .fillColor(item.color)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(String(item.value), sumBoxX, sumBoxY + 8, {
          width: boxW,
          align: "center",
        });
      doc
        .fillColor("#555")
        .fontSize(7.5)
        .font("Helvetica")
        .text(item.label, sumBoxX, sumBoxY + 38, {
          width: boxW,
          align: "center",
        });
      sumBoxX += boxW + gap;
    });

    // Records Table
    const tableY = sumBoxY + boxH + 25;
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Daily Records", 40, tableY);
    doc
      .moveTo(40, tableY + 18)
      .lineTo(555, tableY + 18)
      .strokeColor(accentColor)
      .lineWidth(1)
      .stroke();

    // Table header
    const cols = {
      date: 40,
      nepali: 120,
      checkIn: 210,
      checkOut: 295,
      status: 380,
      late: 455,
      early: 510,
    };
    const headerY = tableY + 25;

    doc.rect(40, headerY, 515, 18).fill(primaryColor);
    doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
    doc.text("Date (AD)", cols.date, headerY + 4);
    doc.text("Date (BS)", cols.nepali, headerY + 4);
    doc.text("Check In", cols.checkIn, headerY + 4);
    doc.text("Check Out", cols.checkOut, headerY + 4);
    doc.text("Status", cols.status, headerY + 4);
    doc.text("Late", cols.late, headerY + 4);
    doc.text("Early Out", cols.early, headerY + 4);

    // Table rows
    let rowY = headerY + 18;
    records.forEach((record, idx) => {
      const bg = idx % 2 === 0 ? "white" : lightGray;
      doc.rect(40, rowY, 515, 16).fill(bg);

      const statusColors = {
        present: "#16a34a",
        absent: "#dc2626",
        "on-leave": "#0891b2",
        holiday: "#7c3aed",
        weekend: "#6b7280",
        "half-day": "#d97706",
      };

      doc.fillColor("#333").fontSize(7.5).font("Helvetica");
      const adDate = new Date(record.date);
      doc.text(adDate.toLocaleDateString(), cols.date, rowY + 3);
      doc.text(record.nepaliDate || "-", cols.nepali, rowY + 3);
      doc.text(
        record.checkIn
          ? new Date(record.checkIn).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
        cols.checkIn,
        rowY + 3,
      );
      doc.text(
        record.checkOut
          ? new Date(record.checkOut).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
        cols.checkOut,
        rowY + 3,
      );
      doc
        .fillColor(statusColors[record.status] || "#333")
        .text(record.status || "-", cols.status, rowY + 3);
      doc
        .fillColor(record.isLate ? "#dc2626" : "#16a34a")
        .text(record.isLate ? "Yes" : "No", cols.late, rowY + 3);
      doc
        .fillColor(record.isEarlyLeave ? "#dc2626" : "#16a34a")
        .text(record.isEarlyLeave ? "Yes" : "No", cols.early, rowY + 3);

      rowY += 16;

      // Add new page if needed
      if (rowY > doc.page.height - 60) {
        doc.addPage();
        rowY = 40;
      }
    });

    // Footer
    doc
      .fillColor("#aaa")
      .fontSize(8)
      .font("Helvetica")
      .text("Generated by Finance Institute HRMS", 40, doc.page.height - 35, {
        align: "center",
        width: 515,
      });

    doc.end();
  });
};

module.exports = { generateAttendanceReportPDF };
