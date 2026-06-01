(function () {
  'use strict';

  var REC_ID = '742908027';
  var CARRIER_ID = 'coverCarry742908027';
  var READY_DELAY_MS = 1500;
  var FALLBACK_READY_MS = 6000;
  var NO_VIDEO_READY_MS = 1500;

  function isHeroCta(el) {
    return el && el.closest && el.closest('.t183__buttons');
  }

  function getCarrier() {
    return document.getElementById(CARRIER_ID);
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

  function markReady(carrier) {
    if (!carrier || carrier.classList.contains('cover-video-ready')) {
      return;
    }
    carrier.classList.add('cover-video-ready');
  }

  function scheduleReady(carrier, delay) {
    window.setTimeout(function () {
      markReady(carrier);
    }, delay);
  }

  function getYtPlayer(iframe) {
    if (!window.YT || !window.YT.Player || !iframe) {
      return null;
    }
    try {
      if (iframe.id) {
        return YT.get(iframe.id);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function waitForPlayback(carrier, iframe) {
    var readyTimer = null;
    var pollId = null;
    var fallbackId = window.setTimeout(function () {
      markReady(carrier);
    }, FALLBACK_READY_MS);

    function reveal() {
      if (readyTimer) {
        return;
      }
      readyTimer = window.setTimeout(function () {
        window.clearTimeout(fallbackId);
        if (pollId) {
          window.clearInterval(pollId);
        }
        markReady(carrier);
      }, READY_DELAY_MS);
    }

    function poll() {
      var player = getYtPlayer(iframe);
      if (!player || !player.getPlayerState) {
        return;
      }
      var state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        reveal();
      }
    }

    iframe.addEventListener('load', function () {
      poll();
      pollId = window.setInterval(poll, 120);
    });

    pollId = window.setInterval(poll, 120);
    window.setTimeout(poll, 50);
  }

  function fixIframe(iframe, carrier) {
    if (!iframe) {
      return;
    }

    if (iframe.src) {
      var nextSrc = strengthenEmbedUrl(iframe.src);
      if (iframe.src !== nextSrc) {
        iframe.src = nextSrc;
      }
    }

    iframe.setAttribute('tabindex', '-1');
    iframe.style.setProperty('pointer-events', 'none', 'important');

    if (iframe.dataset.coverUiWatch !== '1') {
      iframe.dataset.coverUiWatch = '1';
      waitForPlayback(carrier, iframe);
    }
  }

  function fixVideo(video) {
    if (!video || video.dataset.coverUiFixed === '1') {
      return;
    }
    video.dataset.coverUiFixed = '1';
    video.removeAttribute('controls');
    video.controls = false;
    video.addEventListener('playing', function () {
      markReady(getCarrier());
    });
    if (!video.paused) {
      scheduleReady(getCarrier(), READY_DELAY_MS);
    }
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
    var carrier = getCarrier();
    if (!rec || !carrier) {
      return;
    }

    if (carrier.dataset.coverUiNoVideoCheck !== '1') {
      carrier.dataset.coverUiNoVideoCheck = '1';
      window.setTimeout(function () {
        if (!carrier.querySelector('iframe, video')) {
          markReady(carrier);
        }
      }, NO_VIDEO_READY_MS);
    }

    hideInjectedControls(rec);

    carrier.querySelectorAll('iframe').forEach(function (iframe) {
      fixIframe(iframe, carrier);
    });
    carrier.querySelectorAll('video').forEach(fixVideo);

    if ('MutationObserver' in window && carrier.dataset.coverUiObserved !== '1') {
      carrier.dataset.coverUiObserved = '1';
      new MutationObserver(function () {
        carrier.querySelectorAll('iframe').forEach(function (iframe) {
          fixIframe(iframe, carrier);
        });
        carrier.querySelectorAll('video').forEach(fixVideo);
        hideInjectedControls(rec);
      }).observe(carrier, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style'] });
    }
  }

  function boot() {
    apply();
    window.setTimeout(apply, 0);
    window.setTimeout(apply, 300);
  }

  if (document.documentElement) {
    boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', boot);
})();
