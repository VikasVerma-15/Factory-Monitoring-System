const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  worker_id: {
    type: String,
    required: true,
    index: true
  },
  workstation_id: {
    type: String,
    required: true,
    index: true
  },
  event_type: {
    type: String,
    required: true,
    enum: ['working', 'idle', 'absent', 'product_count'],
    index: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  count: {
    type: Number,
    default: 1
  },
  // For deduplication
  event_hash: {
    type: String,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
eventSchema.index({ worker_id: 1, timestamp: 1 });
eventSchema.index({ workstation_id: 1, timestamp: 1 });
eventSchema.index({ event_type: 1, timestamp: 1 });

module.exports = mongoose.model('Event', eventSchema);


