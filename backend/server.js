const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const { OpenAI } = require('openai'); // Using OpenAI class from version 4.x.x
const fs = require('fs');
require('dotenv').config();

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = file.originalname.split('.').pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Database model
const Submission = require('./models/Submission');

// File upload route
app.post('/upload', upload.single('report'), async (req, res) => {
  const { patient_name, phone_number, email, center_id } = req.body;

  console.log('Request Body:', req.body);
  console.log('Uploaded File:', req.file);

  if (!center_id) {
    return res.status(400).send({ message: 'center_id is required' });
  }
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  try {
    // Read the uploaded file
    const reportContent = fs.readFileSync(req.file.path, 'utf-8');

    // Prepare OpenAI API prompt
    const prompt = `
    Analyze the following diagnostic report and provide:
    1. List of things that are normal.
    2. List of things that are abnormal, with possible reasons.
    3. Suggested next steps.
    4. Consequences if no action is taken.

    Report content: ${reportContent}`;

    // Call OpenAI API with gpt-3.5-turbo
    const openAiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });

    const simplifiedReport = openAiResponse.choices[0].message.content.trim();

    // Save the simplified report to a file
    const reportFileName = `simplified_report_${Date.now()}.txt`;
    const reportFilePath = `uploads/${reportFileName}`;
    fs.writeFileSync(reportFilePath, simplifiedReport);

    // Save the submission with the generated report
    const submission = new Submission({
      center_id,
      patient_name,
      phone_number,
      email,
      original_report_url: req.file.path,
      simplified_report_url: reportFilePath, // Save the file path for simplified report
    });

    await submission.save();

    console.log('Saved Submission:', submission);
    res.status(201).send({
      message: 'Uploaded successfully',
      original_report_url: req.file.path,
      simplified_report_url: reportFilePath,
    });
  } catch (error) {
    console.error('Error processing report:', error.message);
    res.status(500).send({ message: 'Error processing report', error: error.message });
  }
});

// List submissions route
app.get('/submissions', async (req, res) => {
  const { center_id } = req.query;

  console.log('Fetching submissions for center_id:', center_id);

  try {
    const submissions = await Submission.find({ center_id });
    console.log('Found submissions:', submissions);
    res.status(200).send(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error.message);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
