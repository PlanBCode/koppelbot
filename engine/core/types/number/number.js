function renderUnit (unit) {
  return unit.replace(/\^(\w+)/g, (full, exponent) => `<sup>${exponent}</sup>`);
}
exports.renderUnit = renderUnit;
exports.actions = {
  edit: function (item) {
    const INPUT = document.createElement('INPUT');
    INPUT.type = 'number';
    // TODO add id from options (for label for)
    INPUT.value = item.getContent();
    INPUT.step = item.getSetting('step');
    INPUT.min = item.getSetting('min');
    INPUT.max = item.getSetting('max');

    if (item.patch) {
      INPUT.oninput = () => {
        item.patch(INPUT.value);
      };
    }
    const onChangeHandler = node => {
      const content = node.getContent();
      // TODO use status
      if (INPUT !== document.activeElement) { // we don't want to interupt typing
        INPUT.value = content;
      }
    };
    item.onChange(onChangeHandler);
    onChangeHandler(item);
    return INPUT;
  },
  view: function (item) {
    const SPAN = document.createElement('SPAN');
    const onChangeHandler = node => {
      switch (node.getStatus()) {
        case 500 :
          SPAN.innerText = 'Server error';
          break;
        case 400 :
          SPAN.innerText = 'Bad request';
          break;
        case 403 :
          SPAN.innerText = 'Forbidden';
          break;
        case 404 :
          SPAN.innerText = 'Not found';
          break;
        default: {
          const content = node.getContent();
          if (content === null) SPAN.innerText = '-';
          else if (node.hasSetting('unit')) {
            SPAN.innerHTML = content + '&nbsp;' + renderUnit(node.getSetting('unit'));// TODO parse sub,super
          } else SPAN.innerText = content;
          break;
        }
      }
    };
    onChangeHandler(item);
    item.onChange(onChangeHandler);
    return SPAN;
  },
  validateContent: function (item) {
    // TODO nr of decimals
    const content = Number(item.getContent());
    if (isNaN(content)) return false;
    if (item.hasSetting('max') && content > item.getSetting('max')) return false;
    if (item.hasSetting('min') && content < item.getSetting('min')) return false;
    if (item.hasSetting('step') && content / item.getSetting('step') !== Math.floor(content / item.getSetting('step'))) return false;
    return true;
  }
};
