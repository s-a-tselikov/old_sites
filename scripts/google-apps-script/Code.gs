/**
 * Форма обратной связи — przdnt.com (отдельный GAS-проект, не скрипт 1984).
 *
 * === Развёртывание ===
 * 1. script.google.com → Новый проект → вставить этот файл целиком.
 * 2. Развернуть → Новое развёртывание → Веб-приложение (запуск от «я», доступ «все»).
 * 3. URL …/exec → data/contact-config.js → CONTACT_FORM_ENDPOINT
 *
 * === Если «This app is blocked» при авторизации Gmail ===
 * Google блокирует новые непроверенные приложения с доступом к почте.
 * Нужно один раз настроить OAuth consent screen (5–10 мин):
 *
 * A) Apps Script → Проект → Настройки проекта (⚙) → «Проект Google Cloud Platform»
 *    Запомните номер проекта (или «Сменить проект» → создать новый).
 *
 * B) console.cloud.google.com → выберите этот проект →
 *    «APIs & Services» → «OAuth consent screen»:
 *    - User type: External → Create
 *    - App name: przdnt contact (любое), User support email: ваш Gmail
 *    - Developer contact: ваш Gmail → Save and Continue
 *    - Scopes: можно пропустить (добавятся при первом Run)
 *    - Test users: + ADD USERS → ваш Gmail (тот же, что владелец скрипта)
 *    - Save → статус «Testing» — это нормально для личного использования
 *
 * C) В редакторе Apps Script: выбрать authorizeContactForm → Run (▶).
 *    Если «Google hasn't verified this app» → Advanced → Go to … (unsafe) → Allow.
 *
 * D) Проверить «Входящие» и «Спам». Gmail API подключать не обязательно.
 *
 * Посетители сайта OAuth не проходят — права выдаёт только владелец скрипта.
 * Для каждого нового сайта — свой GAS-проект и свой URL в contact-config.js.
 */

var CONFIG = {
  contactToEmail: 'satselikov@gmail.com',
  contactSubjectPrefix: 'Спектакль "Ложитесь, господин президент!" — przdnt.com',
  contactMinMessage: 10,
  contactMaxMessage: 5000,
  contactRateLimitSec: 60,
  contactCounterPeriodKey: 'PRZDNT_CONTACT_COUNTER_PERIOD',
  contactCounterSeqKey: 'PRZDNT_CONTACT_COUNTER_SEQ',
  contactApiVersion: 5,
};

function authorizeContactForm() {
  var to = CONFIG.contactToEmail;

  GmailApp.sendEmail(
    to,
    'przdnt.com — тест формы обратной связи',
    'Если вы видите это письмо, отправка с сайта przdnt.com настроена правильно.\n\nВремя: ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Moscow', 'dd.MM.yyyy HH:mm:ss'),
    { name: 'przdnt.com' }
  );

  Logger.log('Тестовое письмо отправлено на: ' + to);
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'przdnt-contact',
    version: CONFIG.contactApiVersion || 0,
  });
}

function doPost(e) {
  try {
    var data = parseContactPayload_(e);

    if (data.ping) {
      return jsonResponse_({ ok: true, ping: true });
    }

    if (data.website) {
      return jsonResponse_({ ok: true });
    }

    validateContact_(data);
    checkContactRateLimit_(data.email);
    sendContactEmail_(data);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error.message || error) });
  }
}

function parseContactPayload_(e) {
  var raw = '';
  if (e && e.postData && e.postData.contents) {
    raw = e.postData.contents;
  } else if (e && e.parameter) {
    return {
      name: String(e.parameter.name || '').trim(),
      email: String(e.parameter.email || '').trim(),
      message: String(e.parameter.message || '').trim(),
      website: String(e.parameter.website || '').trim(),
      source: String(e.parameter.source || '').trim(),
      ping: String(e.parameter.ping || '') === 'true',
    };
  }

  if (!raw) {
    throw new Error('Пустой запрос');
  }

  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseError) {
    throw new Error('Некорректный формат данных');
  }

  return {
    name: String(parsed.name || '').trim(),
    email: String(parsed.email || '').trim(),
    message: String(parsed.message || '').trim(),
    website: String(parsed.website || '').trim(),
    source: String(parsed.source || '').trim(),
    ping: Boolean(parsed.ping),
  };
}

function isValidContactEmail_(email) {
  var value = String(email || '').trim();
  if (!value || value.length > 200) return false;
  if (/[^\x00-\x7F]/.test(value)) return false;

  var at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@') || at === value.length - 1) return false;

  var local = value.slice(0, at);
  var domain = value.slice(at + 1);
  if (!local || local.length > 64 || !domain || domain.length > 253) return false;

  if (/^\./.test(local) || /\.$/.test(local) || /\.\./.test(local)) return false;
  if (/^-/.test(local) || /-$/.test(local)) return false;

  var localRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localRe.test(local)) return false;

  if (/^\./.test(domain) || /\.$/.test(domain) || /\.\./.test(domain)) return false;

  var labels = domain.split('.');
  if (labels.length < 2) return false;

  var labelRe = /^[a-zA-Z0-9-]+$/;
  for (var i = 0; i < labels.length; i++) {
    var label = labels[i];
    if (!label || label.length > 63) return false;
    if (label.charAt(0) === '-' || label.charAt(label.length - 1) === '-') return false;
    if (!labelRe.test(label)) return false;
  }

  return true;
}

function validateContact_(data) {
  if (!data.name) {
    throw new Error('Укажите, как к вам обращаться.');
  }
  if (data.name.length > 120) {
    throw new Error('Имя слишком длинное.');
  }
  if (!isValidContactEmail_(data.email)) {
    throw new Error('Укажите корректный email.');
  }
  if (!data.message || data.message.length < CONFIG.contactMinMessage) {
    throw new Error('Сообщение слишком короткое.');
  }
  if (data.message.length > CONFIG.contactMaxMessage) {
    throw new Error('Сообщение слишком длинное.');
  }
}

function checkContactRateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var key = 'contact_' + email.toLowerCase().trim();
  if (cache.get(key)) {
    throw new Error('Подождите минуту перед повторной отправкой.');
  }
  cache.put(key, '1', CONFIG.contactRateLimitSec);
}

function padContactSeq_(value) {
  var text = String(value);
  while (text.length < 4) {
    text = '0' + text;
  }
  return text;
}

function nextContactReference_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('Сервер занят. Попробуйте через минуту.');
  }

  try {
    var tz = Session.getScriptTimeZone() || 'Europe/Moscow';
    var period = Utilities.formatDate(new Date(), tz, 'yyMM');
    var props = PropertiesService.getScriptProperties();
    var periodKey = CONFIG.contactCounterPeriodKey || 'CONTACT_COUNTER_PERIOD';
    var seqKey = CONFIG.contactCounterSeqKey || 'CONTACT_COUNTER_SEQ';
    var storedPeriod = props.getProperty(periodKey);
    var seq = parseInt(props.getProperty(seqKey) || '0', 10);

    if (storedPeriod !== period || isNaN(seq) || seq < 0) {
      seq = 0;
      props.setProperty(periodKey, period);
    }

    seq += 1;
    props.setProperty(seqKey, String(seq));

    return period + '-' + padContactSeq_(seq);
  } finally {
    lock.releaseLock();
  }
}

function buildContactSubject_(reference) {
  return CONFIG.contactSubjectPrefix + ' (форма обратной связи, запрос #' + reference + ')';
}

function buildContactDisplayName_(clientName) {
  var name = String(clientName || '').trim();
  if (!name) {
    throw new Error('Укажите, как к вам обращаться.');
  }
  return name;
}

function getSenderEmail_() {
  return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
}

function mimeEncodedWord_(text) {
  return '=?UTF-8?B?' + Utilities.base64Encode(String(text), Utilities.Charset.UTF_8) + '?=';
}

function mimeAddress_(displayName, email) {
  return mimeEncodedWord_(displayName) + ' <' + String(email).trim() + '>';
}

function sendContactEmailViaGmailApi_(data, reference, subject, to, fromEmail) {
  var boundary = 'przdntform_' + String(reference).replace(/[^a-zA-Z0-9]/g, '');
  var clientName = buildContactDisplayName_(data.name);
  var plain = buildContactPlainBody_(data, reference);
  var html = buildContactHtmlBody_(data, reference);
  var mime = [
    'MIME-Version: 1.0',
    'Date: ' + new Date().toUTCString(),
    'To: ' + to,
    'From: ' + mimeAddress_(clientName, fromEmail),
    'Reply-To: ' + mimeAddress_(data.name, data.email),
    'Subject: ' + mimeEncodedWord_(subject),
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(plain, Utilities.Charset.UTF_8),
    '',
    '--' + boundary,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(html, Utilities.Charset.UTF_8),
    '',
    '--' + boundary + '--',
  ].join('\r\n');

  var encoded = Utilities.base64EncodeWebSafe(mime).replace(/=+$/, '');
  Gmail.Users.Messages.send({ raw: encoded }, 'me');
}

function escapeHtmlForEmail_(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildContactHtmlBody_(data, reference) {
  var messageHtml = escapeHtmlForEmail_(data.message).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');

  return [
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.45">',
    'Запрос: #' + escapeHtmlForEmail_(reference) + '<br>',
    'Имя: ' + escapeHtmlForEmail_(data.name) + '<br>',
    'Email: ' + escapeHtmlForEmail_(data.email) + '<br><br>',
    messageHtml,
    '</div>',
  ].join('');
}

function buildContactPlainBody_(data, reference) {
  return [
    'Запрос: #' + reference,
    'Имя: ' + data.name,
    'Email: ' + data.email,
    '',
    data.message,
  ].join('\n');
}

function sendContactEmail_(data) {
  var to = CONFIG.contactToEmail;
  var reference = nextContactReference_();
  var subject = buildContactSubject_(reference);
  var fromEmail = getSenderEmail_();
  var plain = buildContactPlainBody_(data, reference);
  var html = buildContactHtmlBody_(data, reference);
  var clientName = buildContactDisplayName_(data.name);

  try {
    if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Messages) {
      sendContactEmailViaGmailApi_(data, reference, subject, to, fromEmail);
      return;
    }
  } catch (apiError) {
    Logger.log('Gmail API: ' + apiError);
  }

  GmailApp.sendEmail(to, subject, plain, {
    htmlBody: html,
    replyTo: data.email,
    name: clientName,
  });
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
