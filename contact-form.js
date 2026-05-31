(function () {
  'use strict';

  var endpoint = (window.CONTACT_FORM_ENDPOINT || '').trim();
  var subjectPrefix = (window.CONTACT_SUBJECT_PREFIX || '').trim();
  var forms = document.querySelectorAll('[data-contact-form]');
  var warmedUp = false;

  var MESSAGES = {
    ru: {
      nameRequired: 'Укажите, как к вам обращаться.',
      emailInvalid: 'Укажите корректный email.',
      messageTooShort: 'Сообщение слишком короткое (минимум 10 символов).',
      messageTooLong: 'Сообщение слишком длинное (максимум 5000 символов).',
      fillAllFields: 'Для отправки сообщения заполните все поля формы.',
      notConfigured:
        'Форма ещё не подключена к почте. Укажите CONTACT_FORM_ENDPOINT и CONTACT_SUBJECT_PREFIX в data/contact-config.js.',
      sending: 'Отправляется…',
      success:
        'Спасибо! Сообщение отправлено организаторам гастролей.\nМы ответим на указанный email.',
      honeypotSuccess: 'Спасибо! Сообщение отправлено.',
      serverNoJson:
        'Сервер формы не отвечает (ожидался JSON). Проверьте деплой на Render.',
      sendFailed: 'Не удалось отправить сообщение.',
      networkError: 'Не удалось связаться с сервером формы. Попробуйте позже.',
      rateLimit: 'Подождите минуту перед повторной отправкой.',
      nameTooLong: 'Имя слишком длинное.',
      siteNotConfigured: 'Форма не настроена для этого сайта. Обратитесь к администратору.',
      noSubjectPrefix: 'Не указан subjectPrefix.',
      smtpNotConfigured: 'Почтовый сервер не настроен. Попробуйте позже.',
    },
    en: {
      nameRequired: 'Please tell us what to call you.',
      emailInvalid: 'Please enter a valid email address.',
      messageTooShort: 'Message is too short (minimum 10 characters).',
      messageTooLong: 'Message is too long (maximum 5000 characters).',
      fillAllFields: 'Please fill in all fields to send your message.',
      notConfigured:
        'The form is not connected to email yet. Set CONTACT_FORM_ENDPOINT and CONTACT_SUBJECT_PREFIX in data/contact-config.js.',
      sending: 'Sending…',
      success:
        'Thank you! Your message has been sent to the tour organizers.\nWe will reply to the email address you provided.',
      honeypotSuccess: 'Thank you! Your message has been sent.',
      serverNoJson:
        'The form server did not respond (expected JSON). Check the Render deployment.',
      sendFailed: 'Could not send your message.',
      networkError: 'Could not reach the form server. Please try again later.',
      rateLimit: 'Please wait a minute before sending again.',
      nameTooLong: 'Name is too long.',
      siteNotConfigured: 'The form is not configured for this website. Please contact the administrator.',
      noSubjectPrefix: 'Subject prefix is missing.',
      smtpNotConfigured: 'The mail server is not configured. Please try again later.',
    },
  };

  if (!forms.length) return;

  forms.forEach(function (form) {
    form.addEventListener('submit', onSubmit);
    bindFieldErrorReset(form);
    form.addEventListener('input', warmupEndpoint, { once: true, capture: true });
    form.addEventListener('focusin', warmupEndpoint, { once: true, capture: true });

    if (isConfigured() && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (
            entries.some(function (entry) {
              return entry.isIntersecting;
            })
          ) {
            warmupEndpoint();
            observer.disconnect();
          }
        },
        { rootMargin: '320px 0px' }
      );
      observer.observe(form);
    }
  });

  if (isConfigured()) {
    window.setTimeout(warmupEndpoint, 2000);

    var contactSection = document.getElementById('contact') || document.querySelector('[name="contact"]');
    if (contactSection && 'IntersectionObserver' in window) {
      var sectionObserver = new IntersectionObserver(
        function (entries) {
          if (
            entries.some(function (entry) {
              return entry.isIntersecting;
            })
          ) {
            warmupEndpoint();
            sectionObserver.disconnect();
          }
        },
        { rootMargin: '320px 0px' }
      );
      sectionObserver.observe(contactSection);
    }
  }

  function getLang(form) {
    var lang = (form.getAttribute('data-contact-lang') || 'ru').toLowerCase();
    return MESSAGES[lang] ? lang : 'ru';
  }

  function msg(form, key) {
    return MESSAGES[getLang(form)][key];
  }

  function isConfigured() {
    return (
      endpoint &&
      endpoint.indexOf('YOUR_DEPLOYMENT') === -1 &&
      endpoint.indexOf('XXXXXXXX') === -1 &&
      subjectPrefix
    );
  }

  function warmupEndpoint() {
    if (!isConfigured() || warmedUp) return;
    warmedUp = true;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ping: true }),
      keepalive: true,
    }).catch(function () {
      warmedUp = false;
    });
  }

  function getStatusEl(form) {
    return form.querySelector('[data-form-status]');
  }

  function getSubmitBtn(form) {
    return form.querySelector('button[type="submit"]');
  }

  function setStatus(form, text, isSuccess) {
    var el = getStatusEl(form);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-success', Boolean(isSuccess));
    el.classList.toggle('is-error', !isSuccess && Boolean(text));
    el.classList.toggle('is-visible', Boolean(text));
    el.setAttribute('aria-hidden', text ? 'false' : 'true');
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.t-input.is-error').forEach(function (field) {
      field.classList.remove('is-error');
    });
  }

  function setFieldError(form, fieldName) {
    var input = form.querySelector('[name="' + fieldName + '"]');
    if (!input || !input.classList.contains('t-input')) return;
    input.classList.add('is-error');
  }

  function showValidationErrors(form, errors) {
    clearFieldErrors(form);
    if (!errors || !errors.length) return;

    errors.forEach(function (err) {
      if (err.field) {
        setFieldError(form, err.field);
      }
    });

    var message =
      errors.length > 2
        ? msg(form, 'fillAllFields')
        : errors
            .map(function (err) {
              return err.message;
            })
            .join('\n');

    setStatus(form, message, false);
  }

  function bindFieldErrorReset(form) {
    form.querySelectorAll('input[name], textarea[name]').forEach(function (field) {
      if (field.name === 'website') return;
      field.addEventListener('input', function () {
        field.classList.remove('is-error');
        if (!form.querySelector('.t-input.is-error')) {
          var statusEl = getStatusEl(form);
          if (statusEl && statusEl.classList.contains('is-error')) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-visible');
            statusEl.setAttribute('aria-hidden', 'true');
          }
        }
      });
    });
  }

  function createFreshField(oldField) {
    var isTextarea = oldField.tagName === 'TEXTAREA';
    var field = isTextarea
      ? document.createElement('textarea')
      : document.createElement('input');

    if (!isTextarea && oldField.type) {
      field.type = oldField.type;
    }
    field.name = oldField.name;
    if (oldField.placeholder) {
      field.placeholder = oldField.placeholder;
    }
    if (oldField.required) {
      field.required = true;
    }
    if (oldField.className) {
      field.className = oldField.className;
    }
    if (oldField.getAttribute('style')) {
      field.setAttribute('style', oldField.getAttribute('style'));
    }
    if (isTextarea && oldField.rows) {
      field.rows = oldField.rows;
    }

    var savedAutocomplete =
      oldField.getAttribute('data-autocomplete') ||
      oldField.getAttribute('autocomplete') ||
      '';

    if (savedAutocomplete) {
      field.setAttribute('data-autocomplete', savedAutocomplete);
    }

    field.value = '';
    field.defaultValue = '';
    field.setAttribute('autocomplete', 'new-password');

    if (savedAutocomplete) {
      field.addEventListener(
        'focus',
        function restoreAutocomplete() {
          field.setAttribute('autocomplete', savedAutocomplete);
        },
        { once: true }
      );
    }

    return field;
  }

  function resetContactForm(form) {
    if (document.activeElement && form.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    var resetCount = parseInt(form.getAttribute('data-contact-reset') || '0', 10) + 1;
    form.setAttribute('data-contact-reset', String(resetCount));

    var freshFields = [];
    form.querySelectorAll('input[name], textarea[name]').forEach(function (field) {
      if (field.name === 'website') return;
      var fresh = createFreshField(field);
      field.parentNode.replaceChild(fresh, field);
      freshFields.push(fresh);
    });

    form.reset();

    freshFields.forEach(function (field) {
      field.readOnly = true;
    });

    window.setTimeout(function () {
      freshFields.forEach(function (field) {
        field.readOnly = false;
        field.value = '';
        field.defaultValue = '';
      });
    }, 100);
  }

  function isValidContactEmail(email) {
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

  function readFields(form) {
    var fd = new FormData(form);
    return {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      message: String(fd.get('message') || '').trim(),
      website: String(fd.get('website') || '').trim(),
    };
  }

  function validateClient(form, data) {
    var errors = [];

    if (!data.name) {
      errors.push({ message: msg(form, 'nameRequired'), field: 'name' });
    }
    if (!isValidContactEmail(data.email)) {
      errors.push({ message: msg(form, 'emailInvalid'), field: 'email' });
    }
    if (!data.message || data.message.length < 10) {
      errors.push({ message: msg(form, 'messageTooShort'), field: 'message' });
    } else if (data.message.length > 5000) {
      errors.push({ message: msg(form, 'messageTooLong'), field: 'message' });
    }

    return errors.length ? errors : null;
  }

  function translateServerError(form, rawMessage) {
    var text = String(rawMessage || '').trim();

    if (
      text.indexOf('обращаться') !== -1 ||
      text.indexOf('what to call you') !== -1 ||
      text.indexOf('Имя слишком') !== -1
    ) {
      if (text.indexOf('длинн') !== -1 || text.indexOf('too long') !== -1 || text.indexOf('Имя слишком') !== -1) {
        return { message: msg(form, 'nameTooLong'), field: 'name' };
      }
      return { message: msg(form, 'nameRequired'), field: 'name' };
    }

    if (
      text.indexOf('email') !== -1 ||
      text.indexOf('корректный') !== -1 ||
      text.indexOf('valid email') !== -1
    ) {
      return { message: msg(form, 'emailInvalid'), field: 'email' };
    }

    if (text.indexOf('коротк') !== -1 || text.indexOf('too short') !== -1) {
      return { message: msg(form, 'messageTooShort'), field: 'message' };
    }

    if (text.indexOf('длинн') !== -1 || text.indexOf('too long') !== -1) {
      return { message: msg(form, 'messageTooLong'), field: 'message' };
    }

    if (text.indexOf('минут') !== -1 || text.indexOf('minute') !== -1) {
      return { message: msg(form, 'rateLimit'), field: null };
    }

    if (text.indexOf('не настроена для сайта') !== -1 || text.indexOf('not configured for') !== -1) {
      return { message: msg(form, 'siteNotConfigured'), field: null };
    }

    if (text.indexOf('subjectPrefix') !== -1) {
      return { message: msg(form, 'noSubjectPrefix'), field: null };
    }

    if (text.indexOf('SMTP') !== -1) {
      return { message: msg(form, 'smtpNotConfigured'), field: null };
    }

    if (text.indexOf('ожидался JSON') !== -1 || text.indexOf('expected JSON') !== -1) {
      return { message: msg(form, 'serverNoJson'), field: null };
    }

    return { message: msg(form, 'sendFailed'), field: null };
  }

  async function sendToMailApi(data) {
    var response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message,
        website: data.website,
        source: window.location.hostname || 'berkovich.ge',
        subjectPrefix: subjectPrefix,
      }),
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      throw new Error('__SERVER_NO_JSON__');
    }

    if (!response.ok) {
      throw new Error((payload && payload.error) || '__SEND_FAILED__');
    }

    if (!payload || payload.ok !== true) {
      throw new Error((payload && payload.error) || '__SEND_FAILED__');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submitBtn = getSubmitBtn(form);
    var data = readFields(form);

    if (data.website) {
      form.reset();
      setStatus(form, msg(form, 'honeypotSuccess'), true);
      return;
    }

    var validationErrors = validateClient(form, data);
    if (validationErrors) {
      showValidationErrors(form, validationErrors);
      return;
    }

    if (!isConfigured()) {
      clearFieldErrors(form);
      setStatus(form, msg(form, 'notConfigured'));
      return;
    }

    warmupEndpoint();
    clearFieldErrors(form);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }
    setStatus(form, msg(form, 'sending'));

    try {
      await sendToMailApi(data);
      clearFieldErrors(form);
      resetContactForm(form);
      setStatus(form, msg(form, 'success'), true);
    } catch (sendError) {
      var raw = sendError.message || '';
      if (raw === 'Failed to fetch') {
        raw = '__NETWORK__';
      }
      if (raw === '__SERVER_NO_JSON__') {
        showValidationErrors(form, [{ message: msg(form, 'serverNoJson'), field: null }]);
      } else if (raw === '__NETWORK__') {
        showValidationErrors(form, [{ message: msg(form, 'networkError'), field: null }]);
      } else if (raw === '__SEND_FAILED__') {
        showValidationErrors(form, [{ message: msg(form, 'sendFailed'), field: null }]);
      } else {
        var translated = translateServerError(form, raw);
        showValidationErrors(form, [translated]);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  }
})();
