const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || [
  'https://securityassignments.com',
  'https://www.securityassignments.com',
  'http://localhost:4200',
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

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'email-backend-security' });
});

app.post('/send-email', (req, res) => {
  const payload = typeof req.body === 'string'
    ? { notes: req.body, type: 'demo' }
    : (req.body || {});

  const {
    name = '',
    email = '',
    phone = '',
    company = '',
    notes = '',
    message = '',
    type = 'demo',
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

  const transporter = nodemailer.createTransport({
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

  const mailOptions = {
    from: smtpUser,
    to: 'ken.rector@assignpros.com,phill.shaw@assignpros.com,josh.rector@assignpros.com,info@assignpros.com',
    subject: 'SecurityAssignments Demo Request',
    text: [
      `Type: ${type || 'demo'}`,
      `Name: ${name}`,
      `Company: ${company || companyName}`,
      `Contact: ${contactInfo}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Address 1: ${addr1}`,
      `Address 2: ${addr2}`,
      `City: ${city}`,
      `State: ${state}`,
      `Zip: ${zip}`,
      `Notes: ${notes || message}`
    ].join('\n')
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(`Email send failed: ${error.message || error.toString()}`);
    }

    res.status(200).send('Email sent: ' + info.response);
  });
});

app.listen(port, () => {
  console.log(`SecurityAssignments email backend running on port ${port}`);
});
