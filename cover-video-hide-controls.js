(function () {
  'use strict';

  var REC_ID = '742908027';
  var CARRIER_ID = 'coverCarry742908027';

  function isHeroCta(el) {
    return el && el.closest && el.closest('.t183__buttons');
  }

  function strengthenEmbedUrl(src) {
    try {
      var url = new URL(src, window.location.href);
      if (!/youtube\.com|youtu\.be/i.test(url.hostname)) {
        return src;
      }
      url.searchParams.set('controls', '0');
      url.searchParams.set('disablekb', '1');
      url.searchParams.set('fs', '0');
      url.searchParams.set('rel', '0');
      url.searchParams.set('modestbranding', '1');
      url.searchParams.set('iv_load_policy', '3');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('autohide', '1');
      return url.toString();
    } catch (e) {
      return src;
    }
  }

  function fixIframe(iframe) {
    if (!iframe || iframe.dataset.coverUiFixed === '1') {
      return;
    }
    iframe.dataset.coverUiFixed = '1';
    if (iframe.src) {
      iframe.src = strengthenEmbedUrl(iframe.src);
    }
    iframe.setAttribute('tabindex', '-1');
  }

  function fixVideo(video) {
    if (!video || video.dataset.coverUiFixed === '1') {
      return;
    }
    video.dataset.coverUiFixed = '1';
    video.removeAttribute('controls');
    video.controls = false;
  }

  function hideInjectedControls(root) {
    if (!root) {
      return;
    }

    root.querySelectorAll(
      'button, [role="button"], .t-cover__video-controls, [class*="video-control"], [class*="VideoControl"]'
    ).forEach(function (el) {
      if (isHeroCta(el) || !el.closest('.t-cover')) {
        return;
      }
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function apply() {
    var rec = document.getElementById('rec' + REC_ID);
    var carrier = document.getElementById(CARRIER_ID);
    if (!rec) {
      return;
    }

    hideInjectedControls(rec);

    if (!carrier) {
      return;
    }

    carrier.querySelectorAll('iframe').forEach(fixIframe);
    carrier.querySelectorAll('video').forEach(fixVideo);

    if ('MutationObserver' in window && carrier.dataset.coverUiObserved !== '1') {
      carrier.dataset.coverUiObserved = '1';
      new MutationObserver(function () {
        carrier.querySelectorAll('iframe').forEach(fixIframe);
        carrier.querySelectorAll('video').forEach(fixVideo);
        hideInjectedControls(rec);
      }).observe(carrier, { childList: true, subtree: true });
    }
  }

  function init() {
    apply();
    window.setTimeout(apply, 800);
    window.setTimeout(apply, 2500);
    window.setTimeout(apply, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', init);
})();
