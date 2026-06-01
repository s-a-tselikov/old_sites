(function () {
  var OFFSET_DESKTOP = 90;
  var OFFSET_MOBILE = 70;

  function getOffset() {
    return window.innerWidth <= 980 ? OFFSET_MOBILE : OFFSET_DESKTOP;
  }

  function getTicketsTarget() {
    return (
      document.getElementById('rec691598686') ||
      document.getElementById('tickets') ||
      document.querySelector('[name="tickets"]')
    );
  }

  function scrollToTickets() {
    var target = getTicketsTarget();
    if (!target) {
      return;
    }

    var top = target.getBoundingClientRect().top + window.pageYOffset - getOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function isTicketsHref(href) {
    if (!href) {
      return false;
    }
    if (href === '#tickets' || href.slice(-8) === '#tickets') {
      return true;
    }
    try {
      var url = new URL(href, window.location.href);
      return url.hash === '#tickets';
    } catch (e) {
      return false;
    }
  }

  function onTicketLinkClick(event) {
    event.preventDefault();
    event.stopPropagation();
    scrollToTickets();
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#tickets');
    }
  }

  function bindTicketLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      if (!isTicketsHref(link.getAttribute('href'))) {
        return;
      }
      if (link.dataset.ticketScrollBound === '1') {
        return;
      }
      link.dataset.ticketScrollBound = '1';
      link.addEventListener('click', onTicketLinkClick, true);
    });
  }

  function handleInitialHash() {
    if (window.location.hash !== '#tickets') {
      return;
    }
    requestAnimationFrame(function () {
      scrollToTickets();
    });
  }

  function init() {
    bindTicketLinks();
    handleInitialHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
