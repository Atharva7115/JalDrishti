import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import healthRoutes from "./routes/health.routes.js";
import ingestionRoutes from "./routes/ingestion.routes.js";
import stationRoutes from "./routes/station.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import districtRoutes from "./routes/district.routes.js";

const app = express();

/*
|--------------------------------------------------------------------------
| Global Middlewares
|--------------------------------------------------------------------------
*/

app.use(helmet());

app.use(cors());

app.use(morgan("dev"));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/health", healthRoutes);
app.use("/api/ingestion", ingestionRoutes);
app.use("/stations", stationRoutes);
app.use("/api/stations", stationRoutes);

app.use("/alerts", alertRoutes);
app.use("/api/alerts", alertRoutes);

app.use("/districts", districtRoutes);
app.use("/api/districts", districtRoutes);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;