(function () {
  'use strict';

  var endpoint = (window.CONTACT_FORM_ENDPOINT || '').trim();
  var subjectPrefix = (window.CONTACT_SUBJECT_PREFIX || '').trim();
  var forms = document.querySelectorAll('[data-contact-form]');
  var warmedUp = false;

  if (!forms.length) return;

  injectLayoutStyles();

  forms.forEach(function (form) {
    detachTildaForm(form);
    form.addEventListener('submit', onSubmit, true);
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

    var contactSection = document.getElementById('contact');
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

  function injectLayoutStyles() {
    if (document.getElementById('contact-form-layout-styles')) return;

    var style = document.createElement('style');
    style.id = 'contact-form-layout-styles';
    style.textContent =
      '[data-contact-form] .form-status{display:block!important;min-height:5.5em;margin-top:12px;text-align:center;white-space:pre-line;color:#cc3b3b;}' +
      '[data-contact-form] .form-status[hidden]{visibility:hidden!important;}' +
      '[data-contact-form] .form-status.is-error{font-weight:700;}' +
      '[data-contact-form] .form-status.is-success{color:#3dca6a;font-weight:700;}' +
      '[data-contact-form] .t-input.is-error{background-color:#ffb8b8!important;box-shadow:inset 0 0 0 2px #cc3b3b!important;}' +
      '[data-contact-form] .contact-form__hp,[data-contact-form] input[name="website"]{display:none!important;visibility:hidden!important;position:absolute!important;width:0!important;height:0!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;}' +
      '[data-contact-form] .t-form__submit button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}' +
      '#rec571811319 .t698,#rec571811319 form,#rec571811319 .t-form__submit{pointer-events:auto;}' +
      '#rec571911150 .t698,#rec571911150 form,#rec571911150 .t-form__submit{pointer-events:auto;}';
    document.head.appendChild(style);
  }

  function detachTildaForm(form) {
    form.classList.remove('js-form-proccess');
    form.removeAttribute('data-formactiontype');
    form.removeAttribute('data-success-callback');
    form.querySelectorAll('.js-tilda-rule').forEach(function (field) {
      field.classList.remove('js-tilda-rule');
      field.removeAttribute('data-tilda-rule');
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
    var visible = Boolean(text);
    el.hidden = !visible;
    el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    el.textContent = text;
    el.classList.toggle('is-success', Boolean(isSuccess));
    el.classList.toggle('is-error', !isSuccess && visible);
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
        ? 'Для отправки сообщения заполните все поля формы.'
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
            setStatus(form, '', false);
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

  function preserveScrollPosition(action) {
    var x = window.scrollX;
    var y = window.scrollY;
    action();
    window.scrollTo(x, y);
  }

  function resetContactForm(form) {
    preserveScrollPosition(function () {
      if (document.activeElement && form.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      }
    });

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

  function mapServerError(rawMessage) {
    var text = String(rawMessage || '').trim();
    var lower = text.toLowerCase();

    if (lower.indexOf('имя') !== -1 || lower.indexOf('обращаться') !== -1) {
      if (lower.indexOf('длинн') !== -1) {
        return { message: 'Имя слишком длинное.', field: 'name' };
      }
      return { message: 'Укажите, как к вам обращаться.', field: 'name' };
    }

    if (lower.indexOf('email') !== -1 || lower.indexOf('e-mail') !== -1) {
      return { message: 'Укажите корректный email.', field: 'email' };
    }

    if (lower.indexOf('коротк') !== -1) {
      return {
        message: 'Сообщение слишком короткое (минимум 10 символов).',
        field: 'message',
      };
    }

    if (lower.indexOf('длинн') !== -1) {
      return {
        message: 'Сообщение слишком длинное (максимум 5000 символов).',
        field: 'message',
      };
    }

    if (lower.indexOf('минут') !== -1) {
      return { message: 'Подождите минуту перед повторной отправкой.', field: null };
    }

    if (lower.indexOf('не настроена для сайта') !== -1) {
      return {
        message: 'Форма не настроена для этого сайта. Обратитесь к администратору.',
        field: null,
      };
    }

    if (lower.indexOf('ожидался json') !== -1) {
      return {
        message: 'Сервер формы не отвечает (ожидался JSON). Проверьте деплой на Render.',
        field: null,
      };
    }

    return { message: text || 'Не удалось отправить сообщение.', field: null };
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
    var errors = [];

    if (!data.name) {
      errors.push({ message: 'Укажите, как к вам обращаться.', field: 'name' });
    } else if (data.name.length > 120) {
      errors.push({ message: 'Имя слишком длинное.', field: 'name' });
    }
    if (!isValidContactEmail(data.email)) {
      errors.push({ message: 'Укажите корректный email.', field: 'email' });
    }
    if (!data.message || data.message.length < 10) {
      errors.push({
        message: 'Сообщение слишком короткое (минимум 10 символов).',
        field: 'message',
      });
    } else if (data.message.length > 5000) {
      errors.push({
        message: 'Сообщение слишком длинное (максимум 5000 символов).',
        field: 'message',
      });
    }

    return errors.length ? errors : null;
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
        source: window.location.hostname || 'zvg.am',
        subjectPrefix: subjectPrefix,
      }),
      keepalive: true,
    });

    var payload = null;
    try {
      payload = await response.json();
    } catch (parseError) {
      throw new Error('Сервер формы не отвечает (ожидался JSON). Проверьте деплой на Render.');
    }

    if (!response.ok) {
      throw new Error((payload && payload.error) || 'Не удалось отправить сообщение.');
    }

    if (!payload || payload.ok !== true) {
      throw new Error((payload && payload.error) || 'Не удалось отправить сообщение.');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    var scrollX = window.scrollX;
    var scrollY = window.scrollY;
    var form = event.currentTarget;
    var submitBtn = getSubmitBtn(form);

    if (form.dataset.contactSending === '1') {
      return;
    }

    try {
      var data = readFields(form);

      if (data.website) {
        form.reset();
        setStatus(form, 'Спасибо! Сообщение отправлено.', true);
        return;
      }

      var validationErrors = validateClient(data);
      if (validationErrors) {
        showValidationErrors(form, validationErrors);
        return;
      }

      if (!isConfigured()) {
        clearFieldErrors(form);
        setStatus(
          form,
          'Форма ещё не подключена к почте. Укажите CONTACT_FORM_ENDPOINT и CONTACT_SUBJECT_PREFIX в data/contact-config.js.'
        );
        return;
      }

      warmupEndpoint();
      clearFieldErrors(form);
      form.dataset.contactSending = '1';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
      }
      setStatus(form, 'Отправляется…');

      try {
        await sendToMailApi(data);
        clearFieldErrors(form);
        resetContactForm(form);
        setStatus(
          form,
          'Спасибо! Сообщение отправлено.\nМы ответим на указанный email.',
          true
        );
      } catch (sendError) {
        var msg = sendError.message || 'Ошибка отправки. Попробуйте позже.';
        if (msg === 'Failed to fetch') {
          msg = 'Не удалось связаться с сервером формы. Попробуйте позже.';
        }
        showValidationErrors(form, [mapServerError(msg)]);
      } finally {
        form.dataset.contactSending = '0';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
        }
      }
    } finally {
      window.scrollTo(scrollX, scrollY);
    }
  }
})();
