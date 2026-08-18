import { PrismaClient } from "@prisma/client";
import { generateAllAlerts, acknowledgeAlert } from "../services/alert.service.js";

const prisma = new PrismaClient();

/**
 * GET /api/alerts
 * Query params: page, limit, severity, district, stationId, isResolved
 */
export async function getAlerts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { severity, district, stationId, isResolved } = req.query;

    const where = {};
    
    if (severity) {
      where.severity = severity.toUpperCase();
    }
    
    if (isResolved !== undefined) {
      where.isResolved = isResolved === "true";
    }

    if (stationId) {
      where.stationId = stationId;
    }

    if (district) {
      where.station = {
        district: {
          equals: district,
          mode: "insensitive"
        }
      };
    }

    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          station: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.alert.count({ where })
    ]);

    // Format DTO
    const data = items.map(item => ({
      id: item.id,
      stationId: item.stationId,
      stationName: item.station.stationName,
      district: item.station.district,
      title: item.title,
      description: item.message,
      severity: item.severity,
      acknowledged: item.isResolved,
      createdAt: item.createdAt,
      resolvedAt: item.resolvedAt
    }));

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      details: err.message
    });
  }
}

/**
 * GET /api/alerts/stats
 */
export async function getAlertStats(req, res) {
  try {
    const stats = await prisma.alert.groupBy({
      by: ["severity", "isResolved"],
      _count: true
    });

    const summary = {
      total: 0,
      unresolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const stat of stats) {
      const count = stat._count;
      summary.total += count;
      if (!stat.isResolved) {
        summary.unresolved += count;
        if (stat.severity === "CRITICAL") summary.critical += count;
        if (stat.severity === "HIGH") summary.high += count;
        if (stat.severity === "MEDIUM") summary.medium += count;
        if (stat.severity === "LOW") summary.low += count;
      }
    }

    return res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alert stats",
      details: err.message
    });
  }
}

/**
 * GET /api/alerts/:id
 */
export async function getAlertById(req, res) {
  try {
    const { id } = req.params;
    const item = await prisma.alert.findUnique({
      where: { id },
      include: { station: true }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    return res.json({
      success: true,
      data: {
        id: item.id,
        stationId: item.stationId,
        stationName: item.station.stationName,
        district: item.station.district,
        title: item.title,
        description: item.message,
        severity: item.severity,
        acknowledged: item.isResolved,
        createdAt: item.createdAt,
        resolvedAt: item.resolvedAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alert details",
      details: err.message
    });
  }
}

/**
 * GET /api/alerts/station/:stationId
 */
export async function getAlertsByStation(req, res) {
  try {
    const { stationId } = req.params;
    const items = await prisma.alert.findMany({
      where: { stationId },
      include: { station: true },
      orderBy: { createdAt: "desc" }
    });

    const data = items.map(item => ({
      id: item.id,
      stationId: item.stationId,
      stationName: item.station.stationName,
      district: item.station.district,
      title: item.title,
      description: item.message,
      severity: item.severity,
      acknowledged: item.isResolved,
      createdAt: item.createdAt,
      resolvedAt: item.resolvedAt
    }));

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch station alerts",
      details: err.message
    });
  }
}

/**
 * POST /api/alerts/run
 */
export async function runAlertDetection(req, res) {
  try {
    const summary = await generateAllAlerts();
    return res.json({
      success: true,
      message: `Alert detection execution completed. Created/Updated ${summary.count} alerts.`,
      data: summary
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Alert detection run failed",
      details: err.message
    });
  }
}

/**
 * PATCH /api/alerts/:id/acknowledge
 */
export async function patchAcknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    const updated = await acknowledgeAlert(id);
    return res.json({
      success: true,
      message: "Alert acknowledged successfully",
      data: {
        id: updated.id,
        acknowledged: updated.isResolved,
        resolvedAt: updated.resolvedAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to acknowledge alert",
      details: err.message
    });
  }
}
