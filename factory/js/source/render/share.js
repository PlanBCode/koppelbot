/*

options.shareButtonText || 'Share',
options.shareTitle
options.shareText
 */

const renderUiShare = (xyz, options, WRAPPER) => {
  WRAPPER.classList.add('xyz-share');
  WRAPPER.innerText = options.shareButtonText || 'Share';
  WRAPPER.onclick = () => {
    if (navigator.share) {
      navigator.share({
        title: options.shareTitle,
        text: options.shareText,
        url: window.location.href
      });
    } else {
      window.location = 'mailto:?subject=' + options.shareTitle + (options.shareTitle ? ' : ' : '') + window.location.href;
    }
  };
};

exports.renderUiShare = renderUiShare;
