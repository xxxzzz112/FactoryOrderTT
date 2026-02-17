const mongoose = require('mongoose');

const FactorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

const Factory = mongoose.model('Factory', FactorySchema);

module.exports = { Factory };
