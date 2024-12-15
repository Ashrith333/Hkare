const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  center_id: String,
  patient_name: String,
  phone_number: String,
  email: String,
  original_report_url: String,
  simplified_report_url: String, // Updated to save the simplified report URL
});

module.exports = mongoose.model('Submission', submissionSchema);
