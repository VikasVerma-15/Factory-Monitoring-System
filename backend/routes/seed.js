const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Workstation = require('../models/Workstation');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');

// Generate event hash for deduplication using bcrypt with fixed salt (deterministic)
const FIXED_SALT = '$2a$10$7xKX9vJ8qYzN3mP5rT2wVu'; // Fixed salt for deterministic hashing
const generateEventHash = async (event) => {
  const hashString = `${event.timestamp}_${event.worker_id}_${event.workstation_id}_${event.event_type}_${event.count}`;
  // Use bcrypt with fixed salt for deterministic duplicate detection
  return await bcrypt.hash(hashString, FIXED_SALT);
};

// Seed initial data
router.post('/init', async (req, res) => {
  try {
    // Clear existing data
    await Worker.deleteMany({});
    await Workstation.deleteMany({});
    await Event.deleteMany({});

    // Create workers
    const workers = [
      { worker_id: 'W1', name: 'John Smith' },
      { worker_id: 'W2', name: 'Sarah Johnson' },
      { worker_id: 'W3', name: 'Mike Williams' },
      { worker_id: 'W4', name: 'Emily Brown' },
      { worker_id: 'W5', name: 'David Davis' },
      { worker_id: 'W6', name: 'Lisa Anderson' }
    ];

    await Worker.insertMany(workers);

    // Create workstations
    const workstations = [
      { station_id: 'S1', name: 'Assembly Line 1', type: 'assembly' },
      { station_id: 'S2', name: 'Assembly Line 2', type: 'assembly' },
      { station_id: 'S3', name: 'Quality Check Station', type: 'quality' },
      { station_id: 'S4', name: 'Packaging Station 1', type: 'packaging' },
      { station_id: 'S5', name: 'Packaging Station 2', type: 'packaging' },
      { station_id: 'S6', name: 'Testing Station', type: 'testing' }
    ];

    await Workstation.insertMany(workstations);

    // Generate sample events for the last 8 hours
    const now = new Date();
    const startTime = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago
    const events = [];

    // Generate events for each worker
    for (const worker of workers) {
      let currentTime = new Date(startTime);
      let currentStation = workstations[Math.floor(Math.random() * workstations.length)];
      let currentState = 'working';
      let lastStateChange = new Date(currentTime);

      while (currentTime < now) {
        // Change state every 15-45 minutes
        const stateChangeInterval = (15 + Math.random() * 30) * 60 * 1000;
        
        if (currentTime.getTime() - lastStateChange.getTime() > stateChangeInterval) {
          const states = ['working', 'idle', 'working'];
          currentState = states[Math.floor(Math.random() * states.length)];
          lastStateChange = new Date(currentTime);
          
          // Occasionally change workstation
          if (Math.random() > 0.7) {
            currentStation = workstations[Math.floor(Math.random() * workstations.length)];
          }
        }

        // Create event every 5 minutes
        const event = {
          timestamp: new Date(currentTime),
          worker_id: worker.worker_id,
          workstation_id: currentStation.station_id,
          event_type: currentState,
          confidence: 0.85 + Math.random() * 0.15,
          count: 1
        };

        // Add product_count events when working (every 20-30 minutes)
        if (currentState === 'working' && Math.random() > 0.85) {
          const productEvent = {
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: currentStation.station_id,
            event_type: 'product_count',
            confidence: 0.90 + Math.random() * 0.10,
            count: Math.floor(1 + Math.random() * 3) // 1-3 units
          };
          productEvent.event_hash = await generateEventHash(productEvent);
          events.push(productEvent);
        }

        event.event_hash = await generateEventHash(event);
        events.push(event);

        // Move forward 5 minutes
        currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
      }
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Insert events in batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await Event.insertMany(batch);
    }

    res.json({
      message: 'Database seeded successfully',
      workers: workers.length,
      workstations: workstations.length,
      events: events.length
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database', message: error.message });
  }
});

// Add more dummy events (extends existing data)
router.post('/add-events', async (req, res) => {
  try {
    const { hours = 2, workers_count = 6 } = req.body;
    const workers = await Worker.find().limit(workers_count);
    const workstations = await Workstation.find();

    if (workers.length === 0 || workstations.length === 0) {
      return res.status(400).json({ error: 'Please seed initial data first' });
    }

    // Get the latest event timestamp
    const latestEvent = await Event.findOne().sort({ timestamp: -1 });
    const startTime = latestEvent ? new Date(latestEvent.timestamp.getTime() + 60000) : new Date();
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    const events = [];

    for (const worker of workers) {
      let currentTime = new Date(startTime);
      let currentStation = workstations[Math.floor(Math.random() * workstations.length)];
      let currentState = 'working';
      let lastStateChange = new Date(currentTime);

      while (currentTime < endTime) {
        const stateChangeInterval = (15 + Math.random() * 30) * 60 * 1000;
        
        if (currentTime.getTime() - lastStateChange.getTime() > stateChangeInterval) {
          const states = ['working', 'idle', 'working'];
          currentState = states[Math.floor(Math.random() * states.length)];
          lastStateChange = new Date(currentTime);
          
          if (Math.random() > 0.7) {
            currentStation = workstations[Math.floor(Math.random() * workstations.length)];
          }
        }

        const event = {
          timestamp: new Date(currentTime),
          worker_id: worker.worker_id,
          workstation_id: currentStation.station_id,
          event_type: currentState,
          confidence: 0.85 + Math.random() * 0.15,
          count: 1
        };

        if (currentState === 'working' && Math.random() > 0.85) {
          const productEvent = {
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: currentStation.station_id,
            event_type: 'product_count',
            confidence: 0.90 + Math.random() * 0.10,
            count: Math.floor(1 + Math.random() * 3)
          };
          productEvent.event_hash = await generateEventHash(productEvent);
          events.push(productEvent);
        }

        event.event_hash = await generateEventHash(event);
        events.push(event);

        currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
      }
    }

    events.sort((a, b) => a.timestamp - b.timestamp);

    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await Event.insertMany(batch);
    }

    res.json({
      message: `Added ${events.length} new events`,
      events_added: events.length,
      time_range: {
        start: startTime,
        end: endTime
      }
    });
  } catch (error) {
    console.error('Error adding events:', error);
    res.status(500).json({ error: 'Failed to add events', message: error.message });
  }
});

module.exports = router;

