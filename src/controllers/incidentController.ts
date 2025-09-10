// controllers/incidentController.ts
import { Request, Response } from 'express';
import Incident from '../models/Incident';
import Tourist from '../models/Tourist';
import { uploadToIPFS } from '../utils/ipfs';
import { encryptData } from '../utils/crypto';

interface AuthRequest extends Request {
  user?: any; // Use any to avoid complex type definition for now
}

// Report a new incident
export const reportIncident = async (req: AuthRequest, res: Response) => {
  try {
    const {
      touristId,
      type,
      severity = 'medium',
      location,
      dateTime,
      description,
      witnesses = [],
      reportedBy,
      evidenceFiles = []
    } = req.body;

    // Validate required fields
    if (!touristId || !type || !location || !dateTime || !description) {
      return res.status(400).json({
        error: 'Tourist ID, type, location, date/time, and description are required'
      });
    }

    // Verify tourist exists
    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Check authorization - allow access for the tourist owner
    if (tourist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate incident ID
    const currentYear = new Date().getFullYear();
    const incidentCount = await Incident.countDocuments() + 1;
    const incidentId = `FIR-${currentYear}-${incidentCount.toString().padStart(6, '0')}`;

    // Prepare incident data for blockchain storage
    const blockchainData = {
      incidentId,
      touristId: tourist.touristId,
      onchainTouristId: tourist.touristIdOnChain,
      type,
      severity,
      location,
      dateTime: new Date(dateTime),
      description,
      witnesses,
      evidenceFiles,
      reportedBy: reportedBy || {
        name: tourist.fullName,
        phoneNumber: tourist.phoneNumber,
        relationship: 'self'
      },
      timestamp: new Date()
    };

    // Encrypt and store on IPFS
    const encryptedData = encryptData(JSON.stringify(blockchainData));
    const evidenceCID = await uploadToIPFS(encryptedData);

    // Create incident record
    const incident = new Incident({
      incidentId,
      touristId,
      type,
      severity,
      status: 'reported',
      location,
      dateTime: new Date(dateTime),
      description,
      witnesses,
      evidenceFiles,
      evidenceCID,
      reportedBy: reportedBy || {
        name: tourist.fullName,
        phoneNumber: tourist.phoneNumber,
        relationship: 'self'
      },
      firStatus: 'pending',
      onchainStatus: 'pending',
      actions: [{
        actionType: 'police_assigned',
        description: 'Incident reported and awaiting police assignment',
        takenBy: 'SYSTEM',
        timestamp: new Date()
      }]
    });

    await incident.save();

    // Add panic record to tourist if it's an emergency
    if (['assault', 'theft', 'medical', 'accident'].includes(type)) {
      if (!tourist.panics) {
        tourist.panics = [];
      }
      
      tourist.panics.push({
        location,
        timestamp: new Date(dateTime),
        evidenceCID,
        onchainStatus: 'pending'
      });

      await tourist.save();
    }

    console.log(`🚨 New incident reported: ${incidentId} for tourist: ${tourist.touristId}`);

    res.status(201).json({
      success: true,
      incident: {
        incidentId,
        type,
        severity,
        status: 'reported',
        firStatus: 'pending',
        location,
        dateTime,
        evidenceCID
      },
      message: 'Incident reported successfully. Police will be assigned shortly.',
      emergencyContact: type in ['assault', 'medical', 'accident'] ? '+91-100' : '+91-1073'
    });

  } catch (error: any) {
    console.error('Report incident error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get incident details
export const getIncident = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findOne({ incidentId })
      .populate('touristId', 'touristId fullName phoneNumber nationality profileImage');

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Authorization check - allow access for the tourist owner
    if ((incident.touristId as any).userId?.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      incident
    });

  } catch (error: any) {
    console.error('Get incident error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update incident status
export const updateIncidentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { 
      status, 
      firStatus, 
      assignedOfficer, 
      policeStation, 
      firNumber, 
      actionNote 
    } = req.body;

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Update fields
    if (status) incident.status = status;
    if (firStatus) incident.firStatus = firStatus;
    if (assignedOfficer) incident.assignedOfficer = assignedOfficer;
    if (policeStation) incident.policeStation = policeStation;
    
    if (firNumber) {
      incident.firNumber = firNumber;
      incident.firDate = new Date();
    }

    // Add action log
    const actionMap: any = {
      investigating: 'police_assigned',
      resolved: 'case_closed',
      filed: 'fir_filed'
    };

    if (status && actionMap[status]) {
      incident.actions.push({
        actionType: actionMap[status],
        description: actionNote || `Status updated to ${status}`,
        takenBy: req.user?.name || 'System',
        timestamp: new Date()
      });
    }

    incident.updatedAt = new Date();
    await incident.save();

    res.json({
      success: true,
      incident,
      message: 'Incident status updated successfully'
    });

  } catch (error: any) {
    console.error('Update incident status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all incidents for dashboard
export const getAllIncidents = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      type,
      firStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (firStatus) filter.firStatus = firStatus;

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('touristId', 'touristId fullName phoneNumber nationality')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Incident.countDocuments(filter)
    ]);

    // Get summary statistics
    const stats = await Incident.aggregate([
      {
        $group: {
          _id: null,
          totalIncidents: { $sum: 1 },
          byStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          },
          bySeverity: {
            $push: {
              severity: '$severity',
              count: 1
            }
          },
          byType: {
            $push: {
              type: '$type',
              count: 1
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      incidents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      summary: stats[0] || {
        totalIncidents: 0,
        byStatus: [],
        bySeverity: [],
        byType: []
      }
    });

  } catch (error: any) {
    console.error('Get all incidents error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate e-FIR PDF (placeholder - would integrate with actual PDF generation)
export const generateFIR = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findOne({ incidentId })
      .populate('touristId', 'touristId fullName phoneNumber nationality profileImage');

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Generate FIR number if not exists
    if (!incident.firNumber) {
      const firCount = await Incident.countDocuments({ firNumber: { $exists: true } }) + 1;
      incident.firNumber = `FIR/${new Date().getFullYear()}/${firCount.toString().padStart(4, '0')}`;
      incident.firDate = new Date();
      incident.firStatus = 'filed';
      
      incident.actions.push({
        actionType: 'fir_filed',
        description: `e-FIR generated with number ${incident.firNumber}`,
        takenBy: req.user?.name || 'System',
        timestamp: new Date()
      });

      await incident.save();
    }

    // In a real implementation, generate PDF here
    const firData = {
      firNumber: incident.firNumber,
      firDate: incident.firDate,
      incidentId: incident.incidentId,
      tourist: incident.touristId,
      incidentDetails: {
        type: incident.type,
        severity: incident.severity,
        dateTime: incident.dateTime,
        location: incident.location,
        description: incident.description,
        witnesses: incident.witnesses
      },
      reportedBy: incident.reportedBy,
      policeStation: incident.policeStation,
      assignedOfficer: incident.assignedOfficer,
      actions: incident.actions
    };

    res.json({
      success: true,
      fir: firData,
      message: 'e-FIR generated successfully'
    });

  } catch (error: any) {
    console.error('Generate FIR error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get incident statistics for dashboard
export const getIncidentStats = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    const [overallStats, trendData, locationData] = await Promise.all([
      // Overall statistics
      Incident.aggregate([
        {
          $group: {
            _id: null,
            totalIncidents: { $sum: 1 },
            byStatus: {
              $push: '$status'
            },
            bySeverity: {
              $push: '$severity'
            },
            byType: {
              $push: '$type'
            },
            avgResolutionTime: {
              $avg: {
                $subtract: ['$updatedAt', '$createdAt']
              }
            }
          }
        }
      ]),

      // Trend over time
      Incident.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === '24h' ? '%H:00' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            highSeverity: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'high'] }, 1, 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Location hotspots
      Incident.aggregate([
        {
          $group: {
            _id: {
              lat: { $round: ['$location.latitude', 2] },
              lng: { $round: ['$location.longitude', 2] }
            },
            count: { $sum: 1 },
            types: { $addToSet: '$type' },
            avgSeverity: { $avg: { 
              $switch: {
                branches: [
                  { case: { $eq: ['$severity', 'low'] }, then: 1 },
                  { case: { $eq: ['$severity', 'medium'] }, then: 2 },
                  { case: { $eq: ['$severity', 'high'] }, then: 3 },
                  { case: { $eq: ['$severity', 'critical'] }, then: 4 }
                ],
                default: 2
              }
            }}
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
    ]);

    res.json({
      success: true,
      statistics: {
        period,
        dateRange: { startDate, endDate },
        overall: overallStats[0] || {
          totalIncidents: 0,
          byStatus: [],
          bySeverity: [],
          byType: [],
          avgResolutionTime: 0
        },
        trends: trendData,
        locationHotspots: locationData
      },
      generatedAt: new Date()
    });

  } catch (error: any) {
    console.error('Get incident stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
