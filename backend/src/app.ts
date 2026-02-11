import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import routes from "./routes";

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

const app = express();

app.use(
	cors({
		origin: allowedOrigins.length > 0 ? allowedOrigins : true,
		credentials: allowedOrigins.length > 0,
	}),
);

app.use(express.json());
app.use(morgan("dev"));

// Use routes
app.use(routes);

export default app;
