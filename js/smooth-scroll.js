(function () {
  'use strict';

  function scrollToTickets() {
    var target = document.getElementById('tickets') || document.querySelector('a[name="tickets"]');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href="#tickets"]');
      if (!link) return;
      event.preventDefault();
      scrollToTickets();
      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', '#tickets');
      } else {
        window.location.hash = 'tickets';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
