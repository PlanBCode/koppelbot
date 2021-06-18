exports.showColorPicker = showColorPicker;

function showColorPicker (colors, currentColor, callback) {
  let DIV = document.getElementById('xyz-colorpicker');

  if (!DIV) {
    DIV = document.createElement('DIV');
    DIV.id = 'xyz-colorpicker';
    for (const color of colors) {
      const DIV_color = document.createElement('DIV');
      DIV_color.className = 'xyz-colorpicker-color';
      DIV_color.style.backgroundColor = color;
      DIV.appendChild(DIV_color);
    }

    const BUTTON_cancel = document.createElement('DIV');
    BUTTON_cancel.innerHTML = '&#10005; cancel';
    BUTTON_cancel.className = 'xyz-button-cancel';
    BUTTON_cancel.style.marginTop = '8px';
    BUTTON_cancel.onclick = () => { DIV.style.display = 'none'; };
    DIV.appendChild(BUTTON_cancel);

    document.body.appendChild(DIV);
  } else {
    DIV.style.display = 'block';
  }
  for (const DIV_color of [...DIV.children]) {
    if (DIV_color.className === 'xyz-colorpicker-color') {
      const color = DIV_color.style.backgroundColor;
      DIV_color.style.transform = color === currentColor ? 'scale(1.1,1.1)' : null;
      DIV_color.onclick = () => {
        callback(color);
        DIV.style.display = 'none';
      };
    }
  }
}
