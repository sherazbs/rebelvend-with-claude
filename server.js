require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Heroku (needed for secure cookies behind load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware (used by the staff attendance module)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  }),
);

// ── Staff attendance module ─────────────────────────────────────────────────
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const attendanceService = require('./modules/attendance/attendance.service');

app.use('/staff', attendanceRoutes);

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, company, phone, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const apiKey = process.env.SMTP2GO_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;
  const senderEmail = process.env.SENDER_EMAIL;

  if (!apiKey || !contactEmail || !senderEmail) {
    console.error('Missing SMTP2GO environment variables');
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const htmlBody = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Company:</strong> ${company || 'N/A'}</p>
    <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
    <p><strong>Message:</strong></p>
    <p>${message || 'No message provided.'}</p>
  `;

  try {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: [`<${contactEmail}>`],
        sender: senderEmail,
        subject: `Rebelvend Contact: ${name}`,
        html_body: htmlBody,
        text_body: `Name: ${name}\nEmail: ${email}\nCompany: ${company || 'N/A'}\nPhone: ${phone || 'N/A'}\nMessage: ${message || 'No message provided.'}`,
      }),
    });

    const data = await response.json();

    if (data.data && data.data.succeeded > 0) {
      return res.json({ success: true });
    }

    console.error('SMTP2GO error:', data);
    return res.status(502).json({ error: 'Failed to send email. Please try again.' });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ───────────────────────────────────────────────────────────────────
async function start() {
  // Initialise the attendance database if DB env vars are set
  if (process.env.DB_HOST) {
    try {
      await attendanceService.initDatabase();
      attendanceService.initPool();
      console.log('Attendance database connected');
    } catch (err) {
      console.error('Attendance DB init failed:', err.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rebelvend server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://0.0.0.0:${PORT}`);
  });
}

start();
