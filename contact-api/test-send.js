'use strict';

/**
 * Локальная проверка Hover SMTP (из папки contact-api):
 *   set SMTP_PASS=... && node test-send.js
 */

const nodemailer = require('nodemailer');

const smtpPass = process.env.SMTP_PASS || '';
if (!smtpPass) {
  console.error('Задайте SMTP_PASS (пароль ящика info@timeto.show).');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.hover.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'info@timeto.show',
    pass: smtpPass,
  },
});

async function main() {
  const to = process.env.CONTACT_TO || 'info@timeto.show';
  const from = process.env.CONTACT_FROM || 'info@timeto.show';

  const info = await transporter.sendMail({
    from: `"timeto.show" <${from}>`,
    to,
    subject: 'przdnt.com — тест формы обратной связи',
    text:
      'Если вы видите это письмо, Hover SMTP для формы przdnt.com настроен правильно.\n\n' +
      new Date().toISOString(),
  });

  console.log('Отправлено:', info.messageId);
  console.log('Проверьте', to, '(и папку «Спам»).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
