(function () {
  var OFFSET = 90;

  function getTicketsTarget() {
    return document.getElementById('tickets') || document.querySelector('[name="tickets"]');
  }

  function scrollToTickets() {
    var target = getTicketsTarget();
    if (!target) {
      return;
    }

    var top = target.getBoundingClientRect().top + window.pageYOffset - OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function bindTicketLinks() {
    document.querySelectorAll('a[href="#tickets"]').forEach(function (link) {
      if (link.dataset.ticketScrollBound === '1') {
        return;
      }
      link.dataset.ticketScrollBound = '1';
      link.addEventListener('click', function (event) {
        event.preventDefault();
        scrollToTickets();
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '#tickets');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTicketLinks);
  } else {
    bindTicketLinks();
  }
})();
