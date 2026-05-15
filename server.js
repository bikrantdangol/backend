const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const http = require("http"); // 🆕
const { Server } = require("socket.io"); // 🆕
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
const notificationRoutes = require("./routes/notificationRoutes");

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

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "https://mirmirehrms.vercel.app",
  // "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/occasions", occasionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/zk", zkRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", require("./routes/profileRoutes"));

console.log("✅ Profile routes loaded");

// 🆕 ─── WebSocket Bridge for Office PC ───────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let officeBridge = null;

io.on("connection", (socket) => {
  console.log(`[Bridge] Office PC connected: ${socket.id}`);
  officeBridge = socket;

  socket.on("disconnect", () => {
    console.log("[Bridge] Office PC disconnected");
    officeBridge = null;
  });

  // 🆕 Office bridge sends sync data here → save to MongoDB
  socket.on("sync-data", async (logs) => {
    console.log(`[Bridge] Received ${logs.length} logs from office PC`);
    try {
      const { syncAttendanceLogs } = require("./services/zkService");
      await syncAttendanceLogs();
      socket.emit("sync-done", { success: true });
    } catch (err) {
      console.error("[Bridge] Sync error:", err.message);
      socket.emit("sync-done", { success: false, error: err.message });
    }
  });
});

// 🆕 Trigger sync from website button
app.post("/api/trigger-sync", (req, res) => {
  if (!officeBridge) {
    return res.json({
      success: false,
      message:
        "Office bridge not connected. Please start the bridge on office PC.",
    });
  }
  officeBridge.emit("sync-now");
  res.json({
    success: true,
    message: "Sync triggered! Data will appear shortly.",
  });
});
// 🆕 ─── End WebSocket Bridge ─────────────────────────────────────────────────

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "HRMS API is running", status: "OK" });
});

// ─── Error Middleware (must be last) ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    setTimeout(async () => {
      if (process.env.ZK_REALTIME_ENABLED === "true") {
        console.log("[ZKTeco] Starting real-time listener...");
        startRealTimeListener();
      }

      console.log("[ZKTeco] Starting sync scheduler...");
      startSyncScheduler();

      const PORT = process.env.PORT || 5000;
      // 🆕 Changed from app.listen to server.listen
      server.listen(PORT, () => {
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