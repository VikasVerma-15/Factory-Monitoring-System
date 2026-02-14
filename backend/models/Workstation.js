const mongoose = require('mongoose');

const workstationSchema = new mongoose.Schema({
  station_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'assembly'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Workstation', workstationSchema);


