const mongoose = require('mongoose');

const careerApplicationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'mental',
        'manifestation',
        'healing',
        'rant',
        'dating',
        'energy',
        'petHealing',
      ],
    },
    description: {
      type: String,
      maxlength: 100,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CareerApplication', careerApplicationSchema);
