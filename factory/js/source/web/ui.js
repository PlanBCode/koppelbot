const {setCookieValue, getCookie} = require('./web');
/*
 This controls the fodling/unfolding of TR's with xyz-list-foldable class, if any. And stores preferences in cookie.
 */

function toggle (TR, updateCookie) {
  let TR_next = TR.nextElementSibling;
  while (TR_next) {
    if (TR_next.tagName !== 'TR' || TR_next.classList.contains('xyz-list-foldable')) break;
    TR_next.style.display = TR.classList.contains('xyz-list-folded') ? 'table-row' : 'none';
    TR_next = TR_next.nextElementSibling;
  }
  if (TR.classList.contains('xyz-list-folded')) {
    if (updateCookie) setCookieValue(TR.id + '_fold', '0');
    TR.classList.remove('xyz-list-folded');
  } else {
    if (updateCookie) setCookieValue(TR.id + '_fold', '1');
    TR.classList.add('xyz-list-folded');
  }
}
window.addEventListener('load', () => {
  const cookie = getCookie();
  for (const TR of document.getElementsByClassName('xyz-list-foldable')) {
    if (TR.id) {
      if (cookie[TR.id + '_fold'] === '1') TR.classList.add('xyz-list-folded');
      else if (cookie[TR.id + '_fold'] === '0') TR.classList.remove('xyz-list-folded');

      if (TR.classList.contains('xyz-list-folded')) TR.classList.remove('xyz-list-folded');
      else TR.classList.add('xyz-list-folded');

      toggle(TR, false);
    }
    TR.onclick = () => toggle(TR, true);
  }
});
