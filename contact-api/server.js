/**
 * Минимальный API формы обратной связи.
 * Отправка через Hover SMTP (info@timeto.show), без Gmail / Google OAuth.
 *
 * Переменные окружения (Render → Environment):
 *   SMTP_HOST=mail.hover.com
 *   SMTP_PORT=465
 *   SMTP_USER=info@timeto.show
 *   SMTP_PASS=...          ← пароль ящика Hover (секрет)
 *   CONTACT_TO=info@timeto.show
 *   CONTACT_FROM=info@timeto.show
 *   CONTACT_FROM_NAME=timeto.show
 *   CONTACT_SUBJECT_PREFIX=Спектакль "Ложитесь, господин президент!" — przdnt.com
 */

'use strict';

const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG = {
  contactToEmail: process.env.CONTACT_TO || 'info@timeto.show',
  contactFromEmail: process.env.CONTACT_FROM || 'info@timeto.show',
  contactFromName: process.env.CONTACT_FROM_NAME || 'timeto.show',
  contactSubjectPrefix:
    process.env.CONTACT_SUBJECT_PREFIX ||
    'Спектакль "Ложитесь, господин президент!" — przdnt.com',
  contactMinMessage: 10,
  contactMaxMessage: 5000,
  contactRateLimitSec: 60,
  contactApiVersion: 6,
  smtpHost: process.env.SMTP_HOST || 'mail.hover.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpUser: process.env.SMTP_USER || 'info@timeto.show',
  smtpPass: process.env.SMTP_PASS || '',
};

const rateLimit = new Map();
let counterPeriod = '';
let counterSeq = 0;

function json(res, status, payload) {
  res.status(status).json(payload);
}

function cors(_req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}

function getTransporter() {
  if (!CONFIG.smtpPass) {
    throw new Error('SMTP не настроен: задайте SMTP_PASS в переменных окружения.');
  }

  return nodemailer.createTransport({
    host: CONFIG.smtpHost,
    port: CONFIG.smtpPort,
    secure: CONFIG.smtpPort === 465,
    auth: {
      user: CONFIG.smtpUser,
      pass: CONFIG.smtpPass,
    },
  });
}

function isValidContactEmail(email) {
  const value = String(email || '').trim();
  if (!value || value.length > 200) return false;
  if (/[^\x00-\x7F]/.test(value)) return false;

  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@') || at === value.length - 1) return false;

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local || local.length > 64 || !domain || domain.length > 253) return false;
  if (/^\./.test(local) || /\.$/.test(local) || /\.\./.test(local)) return false;
  if (/^-/.test(local) || /-$/.test(local)) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (/^\./.test(domain) || /\.$/.test(domain) || /\.\./.test(domain)) return false;

  const labels = domain.split('.');
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
  }

  return true;
}

function validateContact(data) {
  if (!data.name) throw new Error('Укажите, как к вам обращаться.');
  if (data.name.length > 120) throw new Error('Имя слишком длинное.');
  if (!isValidContactEmail(data.email)) throw new Error('Укажите корректный email.');
  if (!data.message || data.message.length < CONFIG.contactMinMessage) {
    throw new Error('Сообщение слишком короткое.');
  }
  if (data.message.length > CONFIG.contactMaxMessage) {
    throw new Error('Сообщение слишком длинное.');
  }
}

function checkRateLimit(email) {
  const key = String(email || '').toLowerCase().trim();
  const now = Date.now();
  const last = rateLimit.get(key);
  if (last && now - last < CONFIG.contactRateLimitSec * 1000) {
    throw new Error('Подождите минуту перед повторной отправкой.');
  }
  rateLimit.set(key, now);
}

function nextReference() {
  const tz = 'Europe/Moscow';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: '2-digit',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const period = `${year}${month}`;

  if (period !== counterPeriod) {
    counterPeriod = period;
    counterSeq = 0;
  }
  counterSeq += 1;
  return `${period}-${String(counterSeq).padStart(4, '0')}`;
}

function buildSubject(reference) {
  return `${CONFIG.contactSubjectPrefix} (форма обратной связи, запрос #${reference})`;
}

function buildPlainBody(data, reference) {
  return [
    `Запрос: #${reference}`,
    `Имя: ${data.name}`,
    `Email: ${data.email}`,
    '',
    data.message,
  ].join('\n');
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlBody(data, reference) {
  const messageHtml = escapeHtml(data.message).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  return [
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.45">',
    `Запрос: #${escapeHtml(reference)}<br>`,
    `Имя: ${escapeHtml(data.name)}<br>`,
    `Email: ${escapeHtml(data.email)}<br><br>`,
    messageHtml,
    '</div>',
  ].join('');
}

async function sendContactEmail(data) {
  const reference = nextReference();
  const subject = buildSubject(reference);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${CONFIG.contactFromName}" <${CONFIG.contactFromEmail}>`,
    to: CONFIG.contactToEmail,
    replyTo: `"${data.name}" <${data.email}>`,
    subject,
    text: buildPlainBody(data, reference),
    html: buildHtmlBody(data, reference),
  });
}

function parsePayload(req) {
  const raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) throw new Error('Пустой запрос');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Некорректный формат данных');
  }
}

function normalizePayload(parsed) {
  return {
    name: String(parsed.name || '').trim(),
    email: String(parsed.email || '').trim(),
    message: String(parsed.message || '').trim(),
    website: String(parsed.website || '').trim(),
    source: String(parsed.source || '').trim(),
    ping: Boolean(parsed.ping),
  };
}

app.use(cors);
app.options('*', (_req, res) => res.sendStatus(204));
app.use(express.text({ type: ['text/plain', 'application/json'], limit: '64kb' }));

app.get('/', (_req, res) => {
  json(res, 200, {
    ok: true,
    service: 'przdnt-contact',
    version: CONFIG.contactApiVersion,
    transport: 'hover-smtp',
    configured: Boolean(CONFIG.smtpPass),
  });
});

app.post('/', async (req, res) => {
  try {
    const data = normalizePayload(parsePayload(req));

    if (data.ping) {
      return json(res, 200, { ok: true, ping: true });
    }

    if (data.website) {
      return json(res, 200, { ok: true });
    }

    validateContact(data);
    checkRateLimit(data.email);
    await sendContactEmail(data);

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 200, { ok: false, error: String(error.message || error) });
  }
});

app.listen(PORT, () => {
  console.log(`przdnt-contact-api listening on ${PORT}`);
});
