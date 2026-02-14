const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Worker = require('../models/Worker');
const Workstation = require('../models/Workstation');

// Helper function to calculate time differences
const calculateTimeDiff = (startTime, endTime) => {
  return (endTime - startTime) / 1000 / 60; // Return minutes
};

// Get worker metrics
router.get('/worker/:worker_id', async (req, res) => {
  try {
    const { worker_id } = req.params;
    const { start_date, end_date } = req.query;

    const query = { worker_id };
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    const events = await Event.find(query).sort({ timestamp: 1 });

    if (events.length === 0) {
      return res.json({
        worker_id,
        total_active_time: 0,
        total_idle_time: 0,
        utilization_percentage: 0,
        total_units_produced: 0,
        units_per_hour: 0
      });
    }

    let totalActiveTime = 0; // minutes
    let totalIdleTime = 0; // minutes
    let totalUnitsProduced = 0;
    let lastTimestamp = events[0].timestamp;
    let lastEventType = events[0].event_type;

    // Process events chronologically
    for (let i = 1; i < events.length; i++) {
      const currentEvent = events[i];
      const timeDiff = calculateTimeDiff(lastTimestamp, currentEvent.timestamp);

      if (lastEventType === 'working') {
        totalActiveTime += timeDiff;
      } else if (lastEventType === 'idle') {
        totalIdleTime += timeDiff;
      }

      if (currentEvent.event_type === 'product_count') {
        totalUnitsProduced += currentEvent.count;
      }

      lastTimestamp = currentEvent.timestamp;
      lastEventType = currentEvent.event_type;
    }

    // Handle last event state (assume it continues until now or end_date)
    const endTime = end_date ? new Date(end_date) : new Date();
    const finalTimeDiff = calculateTimeDiff(lastTimestamp, endTime);
    if (lastEventType === 'working') {
      totalActiveTime += finalTimeDiff;
    } else if (lastEventType === 'idle') {
      totalIdleTime += finalTimeDiff;
    }

    const totalTime = totalActiveTime + totalIdleTime;
    const utilizationPercentage = totalTime > 0 ? (totalActiveTime / totalTime) * 100 : 0;
    const unitsPerHour = totalActiveTime > 0 ? (totalUnitsProduced / totalActiveTime) * 60 : 0;

    res.json({
      worker_id,
      total_active_time: Math.round(totalActiveTime * 100) / 100,
      total_idle_time: Math.round(totalIdleTime * 100) / 100,
      utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
      total_units_produced: totalUnitsProduced,
      units_per_hour: Math.round(unitsPerHour * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating worker metrics:', error);
    res.status(500).json({ error: 'Failed to calculate worker metrics', message: error.message });
  }
});

// Get workstation metrics
router.get('/workstation/:station_id', async (req, res) => {
  try {
    const { station_id } = req.params;
    const { start_date, end_date } = req.query;

    const query = { workstation_id: station_id };
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    const events = await Event.find(query).sort({ timestamp: 1 });

    if (events.length === 0) {
      return res.json({
        station_id,
        occupancy_time: 0,
        utilization_percentage: 0,
        total_units_produced: 0,
        throughput_rate: 0
      });
    }

    let occupancyTime = 0; // minutes
    let totalUnitsProduced = 0;
    let lastTimestamp = events[0].timestamp;
    let isOccupied = events[0].event_type !== 'absent';

    for (let i = 1; i < events.length; i++) {
      const currentEvent = events[i];
      const timeDiff = calculateTimeDiff(lastTimestamp, currentEvent.timestamp);

      if (isOccupied) {
        occupancyTime += timeDiff;
      }

      if (currentEvent.event_type === 'product_count') {
        totalUnitsProduced += currentEvent.count;
      }

      isOccupied = currentEvent.event_type !== 'absent';
      lastTimestamp = currentEvent.timestamp;
    }

    // Handle last event state
    const endTime = end_date ? new Date(end_date) : new Date();
    const finalTimeDiff = calculateTimeDiff(lastTimestamp, endTime);
    if (isOccupied) {
      occupancyTime += finalTimeDiff;
    }

    const totalTime = end_date 
      ? calculateTimeDiff(new Date(start_date || events[0].timestamp), new Date(end_date))
      : calculateTimeDiff(events[0].timestamp, new Date());
    
    const utilizationPercentage = totalTime > 0 ? (occupancyTime / totalTime) * 100 : 0;
    const throughputRate = occupancyTime > 0 ? (totalUnitsProduced / occupancyTime) * 60 : 0;

    res.json({
      station_id,
      occupancy_time: Math.round(occupancyTime * 100) / 100,
      utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
      total_units_produced: totalUnitsProduced,
      throughput_rate: Math.round(throughputRate * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating workstation metrics:', error);
    res.status(500).json({ error: 'Failed to calculate workstation metrics', message: error.message });
  }
});

// Get factory-level metrics
router.get('/factory', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const query = {};
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    const events = await Event.find(query).sort({ timestamp: 1 });
    const workers = await Worker.find();
    const workstations = await Workstation.find();

    if (events.length === 0) {
      return res.json({
        total_productive_time: 0,
        total_production_count: 0,
        average_production_rate: 0,
        average_utilization: 0
      });
    }

    // Calculate worker metrics
    const workerMetrics = [];
    for (const worker of workers) {
      const workerEvents = events.filter(e => e.worker_id === worker.worker_id);
      if (workerEvents.length === 0) continue;

      let totalActiveTime = 0;
      let totalUnitsProduced = 0;
      let lastTimestamp = workerEvents[0].timestamp;
      let lastEventType = workerEvents[0].event_type;

      for (let i = 1; i < workerEvents.length; i++) {
        const currentEvent = workerEvents[i];
        const timeDiff = calculateTimeDiff(lastTimestamp, currentEvent.timestamp);

        if (lastEventType === 'working') {
          totalActiveTime += timeDiff;
        }

        if (currentEvent.event_type === 'product_count') {
          totalUnitsProduced += currentEvent.count;
        }

        lastTimestamp = currentEvent.timestamp;
        lastEventType = currentEvent.event_type;
      }

      const endTime = end_date ? new Date(end_date) : new Date();
      const finalTimeDiff = calculateTimeDiff(lastTimestamp, endTime);
      if (lastEventType === 'working') {
        totalActiveTime += finalTimeDiff;
      }

      workerMetrics.push({
        worker_id: worker.worker_id,
        active_time: totalActiveTime,
        units_produced: totalUnitsProduced,
        utilization: totalActiveTime > 0 ? (totalActiveTime / (totalActiveTime + calculateTimeDiff(workerEvents[0].timestamp, endTime))) * 100 : 0
      });
    }

    // Calculate totals
    const totalProductiveTime = workerMetrics.reduce((sum, w) => sum + w.active_time, 0);
    const totalProductionCount = workerMetrics.reduce((sum, w) => sum + w.units_produced, 0);
    const averageUtilization = workerMetrics.length > 0
      ? workerMetrics.reduce((sum, w) => sum + w.utilization, 0) / workerMetrics.length
      : 0;

    const totalTime = end_date
      ? calculateTimeDiff(new Date(start_date || events[0].timestamp), new Date(end_date))
      : calculateTimeDiff(events[0].timestamp, new Date());
    
    const averageProductionRate = totalTime > 0 ? (totalProductionCount / totalTime) * 60 : 0;

    res.json({
      total_productive_time: Math.round(totalProductiveTime * 100) / 100,
      total_production_count: totalProductionCount,
      average_production_rate: Math.round(averageProductionRate * 100) / 100,
      average_utilization: Math.round(averageUtilization * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating factory metrics:', error);
    res.status(500).json({ error: 'Failed to calculate factory metrics', message: error.message });
  }
});

// Get all workers metrics
router.get('/workers', async (req, res) => {
  try {
    const workers = await Worker.find();
    const { start_date, end_date } = req.query;

    const metrics = await Promise.all(
      workers.map(async (worker) => {
        const query = { worker_id: worker.worker_id };
        if (start_date || end_date) {
          query.timestamp = {};
          if (start_date) query.timestamp.$gte = new Date(start_date);
          if (end_date) query.timestamp.$lte = new Date(end_date);
        }

        const events = await Event.find(query).sort({ timestamp: 1 });

        if (events.length === 0) {
          return {
            worker_id: worker.worker_id,
            name: worker.name,
            total_active_time: 0,
            total_idle_time: 0,
            utilization_percentage: 0,
            total_units_produced: 0,
            units_per_hour: 0
          };
        }

        let totalActiveTime = 0;
        let totalIdleTime = 0;
        let totalUnitsProduced = 0;
        let lastTimestamp = events[0].timestamp;
        let lastEventType = events[0].event_type;

        for (let i = 1; i < events.length; i++) {
          const currentEvent = events[i];
          const timeDiff = calculateTimeDiff(lastTimestamp, currentEvent.timestamp);

          if (lastEventType === 'working') {
            totalActiveTime += timeDiff;
          } else if (lastEventType === 'idle') {
            totalIdleTime += timeDiff;
          }

          if (currentEvent.event_type === 'product_count') {
            totalUnitsProduced += currentEvent.count;
          }

          lastTimestamp = currentEvent.timestamp;
          lastEventType = currentEvent.event_type;
        }

        const endTime = end_date ? new Date(end_date) : new Date();
        const finalTimeDiff = calculateTimeDiff(lastTimestamp, endTime);
        if (lastEventType === 'working') {
          totalActiveTime += finalTimeDiff;
        } else if (lastEventType === 'idle') {
          totalIdleTime += finalTimeDiff;
        }

        const totalTime = totalActiveTime + totalIdleTime;
        const utilizationPercentage = totalTime > 0 ? (totalActiveTime / totalTime) * 100 : 0;
        const unitsPerHour = totalActiveTime > 0 ? (totalUnitsProduced / totalActiveTime) * 60 : 0;

        return {
          worker_id: worker.worker_id,
          name: worker.name,
          total_active_time: Math.round(totalActiveTime * 100) / 100,
          total_idle_time: Math.round(totalIdleTime * 100) / 100,
          utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
          total_units_produced: totalUnitsProduced,
          units_per_hour: Math.round(unitsPerHour * 100) / 100
        };
      })
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching workers metrics:', error);
    res.status(500).json({ error: 'Failed to fetch workers metrics', message: error.message });
  }
});

// Get all workstations metrics
router.get('/workstations', async (req, res) => {
  try {
    const workstations = await Workstation.find();
    const { start_date, end_date } = req.query;

    const metrics = await Promise.all(
      workstations.map(async (station) => {
        const query = { workstation_id: station.station_id };
        if (start_date || end_date) {
          query.timestamp = {};
          if (start_date) query.timestamp.$gte = new Date(start_date);
          if (end_date) query.timestamp.$lte = new Date(end_date);
        }

        const events = await Event.find(query).sort({ timestamp: 1 });

        if (events.length === 0) {
          return {
            station_id: station.station_id,
            name: station.name,
            occupancy_time: 0,
            utilization_percentage: 0,
            total_units_produced: 0,
            throughput_rate: 0
          };
        }

        let occupancyTime = 0;
        let totalUnitsProduced = 0;
        let lastTimestamp = events[0].timestamp;
        let isOccupied = events[0].event_type !== 'absent';

        for (let i = 1; i < events.length; i++) {
          const currentEvent = events[i];
          const timeDiff = calculateTimeDiff(lastTimestamp, currentEvent.timestamp);

          if (isOccupied) {
            occupancyTime += timeDiff;
          }

          if (currentEvent.event_type === 'product_count') {
            totalUnitsProduced += currentEvent.count;
          }

          isOccupied = currentEvent.event_type !== 'absent';
          lastTimestamp = currentEvent.timestamp;
        }

        const endTime = end_date ? new Date(end_date) : new Date();
        const finalTimeDiff = calculateTimeDiff(lastTimestamp, endTime);
        if (isOccupied) {
          occupancyTime += finalTimeDiff;
        }

        const totalTime = end_date
          ? calculateTimeDiff(new Date(start_date || events[0].timestamp), new Date(end_date))
          : calculateTimeDiff(events[0].timestamp, new Date());

        const utilizationPercentage = totalTime > 0 ? (occupancyTime / totalTime) * 100 : 0;
        const throughputRate = occupancyTime > 0 ? (totalUnitsProduced / occupancyTime) * 60 : 0;

        return {
          station_id: station.station_id,
          name: station.name,
          occupancy_time: Math.round(occupancyTime * 100) / 100,
          utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
          total_units_produced: totalUnitsProduced,
          throughput_rate: Math.round(throughputRate * 100) / 100
        };
      })
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching workstations metrics:', error);
    res.status(500).json({ error: 'Failed to fetch workstations metrics', message: error.message });
  }
});

module.exports = router;


