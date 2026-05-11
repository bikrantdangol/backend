// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const connectDB = require("./config/db");
// const { errorHandler, notFound } = require("./middleware/errorMiddleware");

// // Routes
// const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");
// const attendanceRoutes = require("./routes/attendanceRoutes");
// const leaveRoutes = require("./routes/leaveRoutes");
// const holidayRoutes = require("./routes/holidayRoutes");
// const occasionRoutes = require("./routes/occasionRoutes");
// const reportRoutes = require("./routes/reportRoutes");
// const zkRoutes = require("./routes/zkRoutes");

// // ZKTeco Services
// const {
//   startRealTimeListener,
//   stopRealTimeListener,
// } = require("./services/zkService");
// const {
//   startSyncScheduler,
//   stopSyncScheduler,
// } = require("./services/zkScheduler");

// dotenv.config();

// // Connect to MongoDB
// connectDB();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Start server after all setup
// const startServer = async () => {
//   try {
//     // Give DB connection time to establish
//     setTimeout(async () => {
//       // Start real-time punch listener (if enabled in .env)
//       if (process.env.ZK_REALTIME_ENABLED === "true") {
//         console.log("[ZKTeco] Starting real-time listener...");
//         startRealTimeListener();
//       }

//       // Start background cron sync
//       console.log("[ZKTeco] Starting sync scheduler...");
//       startSyncScheduler();

//       const PORT = process.env.PORT || 5000;
//       server = app.listen(PORT, () => {
//         console.log(
//           `[Server] Running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
//         );
//       });
//     }, 1000);
//   } catch (error) {
//     console.error("[Server] Startup error:", error);
//     process.exit(1);
//   }
// };

// // Start the server
// let server;
// startServer();

// // API Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/leave", leaveRoutes);
// app.use("/api/holidays", holidayRoutes);
// app.use("/api/occasions", occasionRoutes);
// app.use("/api/reports", reportRoutes);
// app.use("/api/zk", zkRoutes);

// // Health check
// app.get("/", (req, res) => {
//   res.json({ message: "HRMS API is running", status: "OK" });
// });

// // Error Middleware (must be last)
// app.use(notFound);
// app.use(errorHandler);

// // ─── Graceful shutdown ────────────────────────────────────────────────────────
// const shutdown = async (signal) => {
//   console.log(`\n[Server] ${signal} received — shutting down...`);
//   stopSyncScheduler();
//   await stopRealTimeListener();
//   if (server) {
//     server.close(() => {
//       console.log("[Server] HTTP server closed");
//     });
//   }
//   console.log("[Server] Clean exit");
//   process.exit(0);
// };

// process.on("SIGINT", () => shutdown("SIGINT"));
// process.on("SIGTERM", () => shutdown("SIGTERM"));
const dotenv = require("dotenv");

const express = require("express");
const cors = require("cors");
// const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const occasionRoutes = require("./routes/occasionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const zkRoutes = require("./routes/zkRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // ← NEW

// ZKTeco Services
const {
  startRealTimeListener,
  stopRealTimeListener,
} = require("./services/zkService");
const {
  startSyncScheduler,
  stopSyncScheduler,
} = require("./services/zkScheduler");

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
// app.use(cors());
app.use(
  cors({
    origin: "http://localhost:3000", // your Next.js dev URL
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/occasions", occasionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/zk", zkRoutes);
app.use("/api/notifications", notificationRoutes); // ← NEW
app.use("/api/profile", require("./routes/profileRoutes"));
console.log("✅ Profile routes loaded"); // ← add this
// Health check
app.use("/api/reports", require("./routes/reportRoutes"));
app.get("/", (req, res) => {
  res.json({ message: "HRMS API is running", status: "OK" });
});

// Error Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
let server;

const startServer = async () => {
  try {
    // Give DB connection time to establish before starting ZK services
    setTimeout(async () => {
      // Start ZKTeco real-time punch listener (if enabled in .env)
      if (process.env.ZK_REALTIME_ENABLED === "true") {
        console.log("[ZKTeco] Starting real-time listener...");
        startRealTimeListener();
      }

      // Start background cron sync scheduler
      console.log("[ZKTeco] Starting sync scheduler...");
      startSyncScheduler();

      const PORT = process.env.PORT || 5000;
      server = app.listen(PORT, () => {
        console.log(
          `[Server] Running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
        );
      });
    }, 1000);
  } catch (error) {
    console.error("[Server] Startup error:", error);
    process.exit(1);
  }
};

startServer();

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n[Server] ${signal} received — shutting down...`);
  stopSyncScheduler();
  await stopRealTimeListener();
  if (server) {
    server.close(() => {
      console.log("[Server] HTTP server closed");
    });
  }
  console.log("[Server] Clean exit");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
