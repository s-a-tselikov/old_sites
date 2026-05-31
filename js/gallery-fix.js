(function () {
  function splitIntoTwoRows(imageWidths) {
    var total = imageWidths.length;
    var row1Count = total === 9 ? 5 : Math.min(4, Math.ceil(total / 2));
    var rows = [[], []];

    for (var i = 0; i < total; i++) {
      if (i < row1Count) {
        rows[0].push(imageWidths[i]);
      } else {
        rows[1].push(imageWidths[i]);
      }
    }

    if (!rows[1].length) {
      return [rows[0]];
    }

    return rows;
  }

  function relayoutGalleries() {
    window.dispatchEvent(new Event('resize'));
  }

  function applyPatch() {
    if (window.__galleryFixApplied) {
      return;
    }

    window.__galleryFixApplied = true;
    window.t979_divideRows = function (imageWidths) {
      return splitIntoTwoRows(imageWidths);
    };

    relayoutGalleries();
    setTimeout(relayoutGalleries, 300);
    setTimeout(relayoutGalleries, 1200);
  }

  function waitForT979() {
    if (typeof window.t979_divideRows !== 'function') {
      setTimeout(waitForT979, 30);
      return;
    }

    applyPatch();
  }

  waitForT979();
})();
