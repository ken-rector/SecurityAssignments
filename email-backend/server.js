const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || [
  'https://assignpros.com',
  'https://www.assignpros.com',
  'https://messages.assignpros.com',
  'https://securityassignments.com',
  'https://www.securityassignments.com',
  'http://localhost:4300'
].join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, 'dist/assignpros-homesite')));

app.post('/send-email', (req, res) => {
  const payload = typeof req.body === 'string'
    ? { notes: req.body, type: 'contact' }
    : (req.body || {});

  const {
    name = '',
    email = '',
    phone = '',
    company = '',
    notes = '',
    type = 'contact',
    companyName = '',
    contactInfo = '',
    addr1 = '',
    addr2 = '',
    city = '',
    state = '',
    zip = ''
  } = payload;

  const smtpHost = process.env.SMTP_HOST || 'mail.assignpros.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER || 'noreply@assignpros.com';
  const smtpPass = process.env.SMTP_PASS || 'KeRe2023#$ecure';

  let transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  let mailOptions;

  if (type === 'trial') {
    mailOptions = {
      from: smtpUser,
      to: 'ken.rector@assignpros.com,phill.shaw@assignpros.com,josh.rector@assignpros.com,info@assignpros.com',
      subject: 'Trial Request from Website',
      text: `Type: ${type}\nCompany Name: ${companyName}\nContact Info: ${contactInfo}\nAddress 1: ${addr1}\nAddress 2: ${addr2}\nCity: ${city}\nState: ${state}\nZip: ${zip}\nEmail: ${email}\nPhone: ${phone}`
    };
  } else {
    mailOptions = {
      from: smtpUser,
      to: 'ken.rector@assignpros.com,phill.shaw@assignpros.com,josh.rector@assignpros.com,info@assignpros.com',
      subject: 'Information Request from Website',
      text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nCompany: ${company}\nNotes: ${notes}`
    };
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(`Email send failed: ${error.message || error.toString()}`);
    }
    res.status(200).send('Email sent: ' + info.response);
  });
});

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/assignpros-homesite/index.html'));
});

app.listen(port, () => {
  console.log(`Email backend listening on port ${port}`);
});