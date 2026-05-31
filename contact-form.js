(function () {
  'use strict';

  var endpoint = (window.CONTACT_FORM_ENDPOINT || '').trim();
  var forms = document.querySelectorAll('[data-contact-form]');
  var warmedUp = false;

  if (!forms.length) return;

  forms.forEach(function (form) {
    form.addEventListener('submit', onSubmit);
    form.addEventListener('input', warmupEndpoint, { once: true, capture: true });
    form.addEventListener('focusin', warmupEndpoint, { once: true, capture: true });
  });

  if (isConfigured()) {
    window.setTimeout(warmupEndpoint, 2000);

    var contactSection = document.getElementById('contact');
    if (contactSection && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (entries.some(function (entry) {
            return entry.isIntersecting;
          })) {
            warmupEndpoint();
            observer.disconnect();
          }
        },
        { rootMargin: '320px 0px' }
      );
      observer.observe(contactSection);
    }
  }

  function isConfigured() {
    return endpoint && endpoint.indexOf('YOUR_DEPLOYMENT') === -1 && endpoint.indexOf('XXXXXXXX') === -1;
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
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('is-success', Boolean(isSuccess));
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

  function validateClient(data) {
    if (!data.name) {
      throw new Error('Укажите, как к вам обращаться.');
    }
    if (!isValidContactEmail(data.email)) {
      throw new Error('Укажите корректный email.');
    }
    if (!data.message || data.message.length < 10) {
      throw new Error('Сообщение слишком короткое (минимум 10 символов).');
    }
    if (data.message.length > 5000) {
      throw new Error('Сообщение слишком длинное (максимум 5000 символов).');
    }
  }

  async function sendToAppsScript(data) {
    var response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message,
        website: data.website,
        source: window.location.hostname || 'przdnt.com',
      }),
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      if (!response.ok) {
        throw new Error('Сервер вернул ошибку. Попробуйте позже.');
      }
    }

    if (!response.ok) {
      throw new Error((payload && payload.error) || 'Не удалось отправить сообщение.');
    }

    if (payload && payload.ok === false) {
      throw new Error(payload.error || 'Не удалось отправить сообщение.');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submitBtn = getSubmitBtn(form);
    var data = readFields(form);

    if (data.website) {
      form.reset();
      setStatus(form, 'Спасибо! Сообщение отправлено.', true);
      return;
    }

    try {
      validateClient(data);
    } catch (validationError) {
      setStatus(form, validationError.message);
      return;
    }

    if (!isConfigured()) {
      setStatus(
        form,
        'Форма ещё не подключена к почте. Укажите CONTACT_FORM_ENDPOINT в data/contact-config.js.'
      );
      return;
    }

    warmupEndpoint();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }
    setStatus(form, 'Отправляется…');

    try {
      await sendToAppsScript(data);
      resetContactForm(form);
      setStatus(
        form,
        'Спасибо! Сообщение отправлено.\nМы ответим на указанный email.',
        true
      );
    } catch (sendError) {
      setStatus(form, sendError.message || 'Ошибка отправки. Попробуйте позже.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  }
})();
