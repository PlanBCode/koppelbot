/*

options.shareButtonText || 'Share',
options.shareTitle
options.shareText
 */

const renderUiShare = (xyz, options, WRAPPER) => {
  WRAPPER.classList.add('xyz-share');
  WRAPPER.innerText = options.shareButtonText || 'Share';
  if (options.title) WRAPPER.title = options.title;
  WRAPPER.onclick = () => {
    const title = options.shareTitle || document.title;
    if (navigator.share) {
      navigator.share({
        title,
        text: options.shareText,
        url: window.location.href
      });
    } else {
      let DIV_share = document.getElementById('xyz-share-popup');
      if (!DIV_share) {
        DIV_share = document.createElement('DIV');
        DIV_share.id = 'xyz-share-popup';
        const INPUT_href = document.createElement('TEXTAREA');
        INPUT_href.id = 'xyz-share-href';
        INPUT_href.setAttribute('readonly', true);
        const BUTTON_copy = document.createElement('DIV');
        BUTTON_copy.id = 'xyz-share-copy';
        BUTTON_copy.innerHTML = '&#10064; copy';
        BUTTON_copy.onclick = () => {
          INPUT_href.select();
          INPUT_href.setSelectionRange(0, 99999);
          document.execCommand('copy');
          DIV_share.style.display = 'none';
        };
        const BUTTON_email = document.createElement('DIV');
        BUTTON_email.id = 'xyz-share-email';
        BUTTON_email.innerHTML = '&#9993; e-mail';
        BUTTON_email.onclick = () => {
          window.location = 'mailto:?subject=' + title + '&body=' + window.location.href;
          DIV_share.style.display = 'none';
        };
        const BUTTON_cancel = document.createElement('DIV');
        BUTTON_cancel.id = 'xyz-share-cancel';
        BUTTON_cancel.innerHTML = '&#10005; close';
        BUTTON_cancel.onclick = () => { DIV_share.style.display = 'none'; };
        [INPUT_href, BUTTON_cancel, BUTTON_email, BUTTON_copy]
          .forEach(ELEMENT => DIV_share.appendChild(ELEMENT));
        document.body.appendChild(DIV_share);
      }
      const INPUT_href = document.getElementById('xyz-share-href');
      INPUT_href.value = window.location.href;
      DIV_share.style.display = 'block';
    }
  };
};

exports.renderUiShare = renderUiShare;
