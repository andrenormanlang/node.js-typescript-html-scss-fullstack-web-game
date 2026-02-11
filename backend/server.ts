import * as dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./src/app";
import http from "http";
import { Server } from "socket.io";
import { handleConnection } from "./src/controllers/socket_controller";
import {
	ServerToClientEvents,
	ClientToServerEvents,
} from "./src/types/shared/socket_types";

// Initialize dotenv so it reads our `.env` file
dotenv.config();

function parseCorsOrigins(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

const allowedOrigins = parseCorsOrigins(
	process.env.CORS_ORIGINS || process.env.CORS_ORIGIN,
);

// Read port to start server on from `.env`, otherwise default to port 3000
const PORT = process.env.PORT || 3001;

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.DATABASE_URL;

if (!MONGO_URI) {
	console.error("❌ No MongoDB URI found in environment variables");
	process.exit(1);
}

// Connect to MongoDB
mongoose
	.connect(MONGO_URI)
	.then(() => {
		console.log("✅ Connected to MongoDB");
	})
	.catch((err) => {
		console.error("❌ Error connecting to MongoDB:", err.message);
		process.exit(1);
	});

/**
 * Create HTTP and Socket.IO server
 */
const httpServer = http.createServer(app);
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(
	httpServer,
	{
		cors: {
			origin: allowedOrigins.length > 0 ? allowedOrigins : true,
			credentials: allowedOrigins.length > 0,
		},
	},
);

/**
 * Handle incoming Socket.IO connections
 */
io.on("connection", (socket) => {
	handleConnection(socket);
});

/**
 * Listen on provided port, on all network interfaces.
 */
httpServer.listen(PORT);

/**
 * Event listener for HTTP server "error" event.
 */
httpServer.on("error", (err: NodeJS.ErrnoException) => {
	if (err.syscall !== "listen") {
		throw err;
	}

	switch (err.code) {
		case "EACCES":
			console.error(`🦸🏻 Port ${PORT} requires elevated privileges`);
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(`🛑 Port ${PORT} is already in use`);
			process.exit(1);
			break;
		default:
			throw err;
	}
});

/**
 * Event listener for HTTP server "listening" event.
 */
httpServer.on("listening", () => {
	console.log(`🧑🏻‍🍳 Server started on http://localhost:${PORT}`);
});

/**
 * Handle graceful shutdown
 */
process.on("SIGTERM", async () => {
	console.log("👋 SIGTERM received, shutting down gracefully");
	httpServer.close(() => {
		console.log("🔌 HTTP server closed");
	});
	await mongoose.connection.close();
	console.log("🔌 MongoDB connection closed");
	process.exit(0);
});
