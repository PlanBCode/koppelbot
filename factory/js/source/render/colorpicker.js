exports.showColorPicker = showColorPicker;

function componentToHex (c) {
  const hex = Number(c).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex (r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function normalizeColor (color) {
  if (typeof color !== 'string') return color;
  else if (color.startsWith('rgb(')) {
    const [r, g, b] = color.substr(4, color.length - 5).split(',');
    return rgbToHex(r, g, b);
  } else return color;
}

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
      const color = normalizeColor(DIV_color.style.backgroundColor);
      DIV_color.style.transform = color === currentColor ? 'scale(1.1,1.1)' : null;
      DIV_color.onclick = () => {
        callback(color);
        DIV.style.display = 'none';
      };
    }
  }
}
