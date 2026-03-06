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

const captchaVerifyUrl = process.env.CAPTCHA_VERIFY_URL || 'https://www.google.com/recaptcha/api/siteverify';
const captchaSecretKey = process.env.CAPTCHA_SECRET_KEY || (process.env.NODE_ENV === 'production' ? '' : '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe');
const skipCaptcha = process.env.SKIP_CAPTCHA === 'true';

const smsEndpointUrl = process.env.SMS_ENDPOINT_URL || '';
const smsEndpointMethod = (process.env.SMS_ENDPOINT_METHOD || 'GET').toUpperCase();
const smsAlertPhone = process.env.ALERT_SMS_PHONE || '';
const smsAlertMessage = process.env.SMS_ALERT_MESSAGE || 'New SecurityAssignments lead request. Check your inbox.';
const smsAuthHeaderName = process.env.SMS_AUTH_HEADER_NAME || 'x-internal-key';
const smsAuthHeaderValue = process.env.SMS_AUTH_HEADER_VALUE || '';
const smsEnabled = process.env.SMS_ENABLED !== 'false';

function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
}

async function verifyCaptchaToken(captchaToken, remoteIp) {
  if (skipCaptcha) {
    return { ok: true };
  }

  if (!captchaSecretKey) {
    return { ok: false, error: 'Captcha is not configured on the server.' };
  }

  if (!captchaToken) {
    return { ok: false, error: 'Captcha token is required.' };
  }

  const params = new URLSearchParams({
    secret: captchaSecretKey,
    response: captchaToken
  });

  if (remoteIp) {
    params.append('remoteip', remoteIp);
  }

  const response = await fetch(captchaVerifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    return { ok: false, error: 'Captcha verification request failed.' };
  }

  const verifyResult = await response.json();
  if (!verifyResult.success) {
    return { ok: false, error: 'Captcha verification failed.' };
  }

  return { ok: true };
}

async function sendSmsAlert() {
  if (!smsEnabled || !smsEndpointUrl || !smsAlertPhone) {
    return;
  }

  const headers = {};
  if (smsAuthHeaderValue) {
    headers[smsAuthHeaderName] = smsAuthHeaderValue;
  }

  let requestUrl = smsEndpointUrl;
  let requestBody;

  if (smsEndpointMethod === 'GET') {
    const url = new URL(smsEndpointUrl);
    url.searchParams.set('message', smsAlertMessage);
    url.searchParams.set('phone', smsAlertPhone);
    requestUrl = url.toString();
  } else {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify({
      message: smsAlertMessage,
      phone: smsAlertPhone
    });
  }

  const smsResponse = await fetch(requestUrl, {
    method: smsEndpointMethod,
    headers,
    body: requestBody
  });

  if (!smsResponse.ok) {
    const responseBody = await smsResponse.text();
    throw new Error(`SMS endpoint failed (${smsResponse.status}): ${responseBody}`);
  }
}

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'email-backend-security' });
});

app.post('/send-email', async (req, res) => {
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
    captchaToken = '',
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

  try {
    const captchaCheck = await verifyCaptchaToken(captchaToken, getRequestIp(req));
    if (!captchaCheck.ok) {
      return res.status(400).send(captchaCheck.error);
    }

    const info = await transporter.sendMail(mailOptions);

    try {
      await sendSmsAlert();
    } catch (smsError) {
      console.error('SMS alert failed:', smsError);
    }

    res.status(200).send('Email sent: ' + info.response);
  } catch (error) {
    res.status(500).send(`Email send failed: ${error.message || error.toString()}`);
  }
});

app.listen(port, () => {
  console.log(`SecurityAssignments email backend running on port ${port}`);
});
