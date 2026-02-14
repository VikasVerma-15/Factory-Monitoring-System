const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Generate event hash for deduplication using SHA-256 (deterministic)
const generateEventHash = (event) => {
  // Convert timestamp to ISO string for consistent hashing
  const timestampStr = event.timestamp instanceof Date 
    ? event.timestamp.toISOString() 
    : new Date(event.timestamp).toISOString();
  const hashString = `${timestampStr}_${event.worker_id}_${event.workstation_id}_${event.event_type}_${event.count}`;
  // Use SHA-256 for deterministic duplicate detection
  return crypto.createHash('sha256').update(hashString).digest('hex');
};

// Ingest AI event
router.post('/ingest', [
  body('timestamp').isISO8601().withMessage('Valid ISO8601 timestamp required'),
  body('worker_id').notEmpty().withMessage('worker_id is required'),
  body('workstation_id').notEmpty().withMessage('workstation_id is required'),
  body('event_type').isIn(['working', 'idle', 'absent', 'product_count']).withMessage('Invalid event_type'),
  body('confidence').isFloat({ min: 0, max: 1 }).withMessage('confidence must be between 0 and 1'),
  body('count').optional().isInt({ min: 0 }).withMessage('count must be a non-negative integer')
], async (req, res) => {
  try {
    console.log('Event ingest request received:', {
      body: req.body,
      dbState: mongoose.connection.readyState,
      dbName: mongoose.connection.db?.databaseName
    });

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected. ReadyState:', mongoose.connection.readyState);
      return res.status(503).json({ 
        error: 'Database not connected', 
        message: 'Please wait for database connection to be established',
        readyState: mongoose.connection.readyState
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const eventData = {
      timestamp: new Date(req.body.timestamp),
      worker_id: req.body.worker_id,
      workstation_id: req.body.workstation_id,
      event_type: req.body.event_type,
      confidence: req.body.confidence,
      count: req.body.count || 1
    };

    // Generate hash for deduplication (SHA-256 deterministic hash)
    eventData.event_hash = generateEventHash(eventData);

    // Check for duplicate events (within 1 second tolerance) using hash
    const existingEvent = await Event.findOne({
      event_hash: eventData.event_hash,
      timestamp: {
        $gte: new Date(eventData.timestamp.getTime() - 1000),
        $lte: new Date(eventData.timestamp.getTime() + 1000)
      }
    });

    if (existingEvent) {
      return res.status(200).json({
        message: 'Duplicate event detected, skipped',
        event: existingEvent
      });
    }

    console.log('Saving event:', eventData);
    const event = new Event(eventData);
    await event.save();
    console.log('Event saved successfully:', event._id);

    res.status(201).json({
      message: 'Event ingested successfully',
      event
    });
  } catch (error) {
    console.error('Error ingesting event:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    res.status(500).json({ 
      error: 'Failed to ingest event', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Batch ingest events
router.post('/ingest/batch', async (req, res) => {
  try {
    const events = req.body.events || [];
    const results = {
      success: 0,
      duplicates: 0,
      errors: 0,
      errors_list: []
    };

    for (const eventData of events) {
      try {
        const event = {
          timestamp: new Date(eventData.timestamp),
          worker_id: eventData.worker_id,
          workstation_id: eventData.workstation_id,
          event_type: eventData.event_type,
          confidence: eventData.confidence,
          count: eventData.count || 1
        };

        event.event_hash = generateEventHash(event);

        // Check for duplicates using hash
        const existingEvent = await Event.findOne({
          event_hash: event.event_hash,
          timestamp: {
            $gte: new Date(event.timestamp.getTime() - 1000),
            $lte: new Date(event.timestamp.getTime() + 1000)
          }
        });

        if (existingEvent) {
          results.duplicates++;
          continue;
        }

        const newEvent = new Event(event);
        await newEvent.save();
        results.success++;
      } catch (error) {
        results.errors++;
        results.errors_list.push({ event: eventData, error: error.message });
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Error in batch ingest:', error);
    res.status(500).json({ error: 'Failed to batch ingest events', message: error.message });
  }
});

// Get events with filters
router.get('/', async (req, res) => {
  try {
    const { worker_id, workstation_id, event_type, start_date, end_date, limit = 100 } = req.query;
    const query = {};

    if (worker_id) query.worker_id = worker_id;
    if (workstation_id) query.workstation_id = workstation_id;
    if (event_type) query.event_type = event_type;
    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

module.exports = router;

