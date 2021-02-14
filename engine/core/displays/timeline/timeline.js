/*
options:
TODO
- view  left|right|bottom|top
- year/month/day labels
 */

function parseDateString (string) {
  if (typeof string !== 'string') return new Date().getTime();
  const parts = string.split('-'); // TODO use formats.json function or a type.toNumber
  return new Date(parseInt(parts[2], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[0], 10)).getTime();
}

function sortLabels (A, B) {
  const timeA = parseDateString(A.date);
  const timeB = parseDateString(B.date);
  if (timeA === timeB) return 0;
  else return timeA < timeB ? -1 : 1;
}

function getDateFromRatio (DIV, ratio) {
  let minTime = Infinity;
  let maxTime = -Infinity;
  const LABELS = [];
  for (const NODE of DIV.childNodes) {
    if (NODE.classList.contains('xyz-timeline-node')) {
      const time = parseDateString(NODE.date);
      minTime = Math.min(minTime, time);
      maxTime = Math.max(maxTime, time);
    }
  }
  const timestamp = minTime + (maxTime - minTime) * ratio;
  const date = new Date(timestamp); // TODO use formats.json function or a type.toNumber
  let day = date.getDay() + 1;
  if (day < 10) day = '0' + day;
  let month = date.getMonth() + 1;
  if (month < 10) month = '0' + month;
  return day + '-' + month + '-' + date.getFullYear();
}

function drawNodes (DIV, display) {
  const horizontal = display.getOption('horizontal');
  const left = horizontal ? 'left' : 'top';
  const right = horizontal ? 'right' : 'bottom';

  const top = horizontal ? 'top' : 'left';
  const bottom = horizontal ? 'bottom' : 'right';

  const width = horizontal ? 'width' : 'height';

  const Q = Number(display.getOption('midLine') || 0);

  let minTime = Infinity;
  let maxTime = -Infinity;
  const LABELS = [];
  for (const NODE of DIV.childNodes) {
    if (NODE.classList.contains('xyz-timeline-node')) {
      const time = parseDateString(NODE.date);
      minTime = Math.min(minTime, time);
      maxTime = Math.max(maxTime, time);
    } else if (NODE.classList.contains('xyz-timeline-label')) {
      LABELS.push(NODE);
    }
  }
  LABELS.sort(sortLabels);
  for (const NODE of DIV.childNodes) {
    if (NODE.classList.contains('xyz-timeline-node')) {
      const time = parseDateString(NODE.date);
      const ratio = (time - minTime) / (maxTime - minTime);
      NODE.style[top] = Q + '%';
      NODE.style[left] = (ratio * 100) + '%';
    }
  }
  const rectDIV = DIV.getBoundingClientRect();
  const sizeDIV = rectDIV[width];
  const labelMargin = 5;
  for (let i = 0; i < LABELS.length; ++i) {
    const LABEL = LABELS[i];
    const time = parseDateString(LABEL.date);
    const ratio = (time - minTime) / (maxTime - minTime);

    let rectLABEL = LABEL.getBoundingClientRect();
    const sizeLABEL = rectLABEL[width];
    let position = ratio * sizeDIV;
    if (position + sizeLABEL > sizeDIV) position = sizeDIV - sizeLABEL; // ensure labels do not go out of bounds

    LABEL.style[left] = position + 'px';
    rectLABEL = LABEL.getBoundingClientRect();

    if (i > 0) { // ensure labels do not overlap with previous
      const prevRectLABEL = LABELS[i - 1].getBoundingClientRect();
      if (prevRectLABEL[right] + labelMargin > rectLABEL[left]) {
        LABEL.style[left] = (prevRectLABEL[right] - rectDIV[left] + labelMargin) + 'px';
      }
    }
    const defaultTop = 40;
    if (Q === 100) {
      LABEL.style[bottom] = `${defaultTop}px`;
      LABEL.style[top] = null;
    } else if (i % 2 && Q === 50) {
      LABEL.style[bottom] = `calc(${Q}% + ${defaultTop}px)`;
      LABEL.style[top] = null;
    } else {
      LABEL.style[top] = `calc(${Q}% + ${defaultTop}px)`;
      LABEL.style[bottom] = null;
    }
  }

  // DIV.offsetHeight;
  const rDIV = DIV.getBoundingClientRect();
  for (const CONNECTOR of DIV.childNodes) {
    if (CONNECTOR.classList.contains('xyz-timeline-connector')) {
      const r1 = CONNECTOR.NODE.getBoundingClientRect();
      const r2 = CONNECTOR.LABEL.getBoundingClientRect();
      const x1 = CONNECTOR.LABEL.style.left ? r1.left : r1.right;
      const y1 = r1.top;

      const x2 = CONNECTOR.LABEL.style.left ? r2.left : r2.right;
      const y2 = r2.top;

      const d = Math.hypot(x1 - x2, y1 - y2);
      const angle = Math.atan2(y1 - y2, x1 - x2) / Math.PI * 180;

      CONNECTOR.style.transformOrigin = 'center left';
      CONNECTOR.style.transform = `rotate(${(180 + angle)}deg)`;
      CONNECTOR.style.width = d + 'px';

      CONNECTOR.style.left = (r1.left - rDIV.left + 5) + 'px';
      CONNECTOR.style.top = (r1.top - rDIV.top + 3) + 'px';
    }
  }
}

exports.display = {
  waitingForInput: display => {
    display.getWRAPPER().innerHTML = 'Waiting for input...';
  },
  waitingForData: display => {
    display.getWRAPPER().innerHTML = 'Waiting for data...';
  },
  empty: display => {
    display.getWRAPPER().innerHTML = 'No items to display.';
  },
  first: display => {
    const datePropertyName = display.getOption('key') || 'date'; // TODO
    const horizontal = display.getOption('horizontal');
    const Q = (display.getOption('midLine') || '0') + '%';
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = '';
    const DIV = document.createElement('DIV');
    DIV.className = 'xyz-timeline-wrapper';
    const DIV_line = document.createElement('DIV');
    DIV_line.className = 'xyz-timeline-line';

    if (horizontal) {
      DIV_line.style.top = Q;
      DIV_line.style.width = '100%';
      DIV_line.style.height = '2px';
    } else {
      DIV_line.style.left = Q;
      DIV_line.style.width = '2px';
      DIV_line.style.height = '100%';
    }
    DIV.appendChild(DIV_line);
    WRAPPER.appendChild(DIV);
    const DIV_create = display.showCreateButton();
    if (DIV_create) {
      DIV_line.style.cursor = 'pointer';
      DIV_line.onclick = event => {
        DIV_create.style.display = 'block';
        const rect = DIV_line.getBoundingClientRect();
        const ratio = horizontal
          ? (event.clientX - rect.left) / (rect.right - rect.left)
          : (event.clientY - rect.top) / (rect.bottom - rect.top);
        const date = getDateFromRatio(DIV, ratio);
        DIV_create.patch({[datePropertyName]: date});
      };
    }

    if (display.hasOption('select')) {
      display.onSelect(selectEntityId => {
        for (const NODE of DIV.childNodes) {
          if (NODE.classList.contains('xyz-timeline-label')) {
            NODE.classList[NODE.entityId === selectEntityId ? 'add' : 'remove']('xyz-list-selected');
          }
        }
      });
    }

    /* WIP
                const DIV_lineCreator = document.createElement('DIV');
        DIV_lineCreator.className = 'xyz-timeline-line-creator';
        DIV_lineCreator.innerText = '+';

                DIV.appendChild(DIV_lineCreator);

            DIV.addEventListener('mousemove', event => {
            const rectDIV = DIV.getBoundingClientRect();
            const offset = event.clientY - rectDIV.top;

            const timestamp = offset / (rectDIV.bottom - rectDIV.top)

            DIV_lineCreator.innerText = '+';
            DIV_lineCreator.style.top = offset + 'px';
            console.log(timestamp)

        }) */

    window.addEventListener('resize', () => drawNodes(DIV, display));
  },
  entity: display => {
    const datePropertyName = display.getOption('key') || 'date'; // TODO
    const labelPropertyName = display.getOption('label') || 'title'; // TODO

    const dateNode = display.getNode(datePropertyName);
    const labelNode = display.getNode(labelPropertyName);

    const date = dateNode.getContent();

    const entityId = display.getEntityId();

    const WRAPPER = display.getWRAPPER();
    const DIV = WRAPPER.firstChild;
    const NODE = document.createElement('DIV');
    NODE.className = 'xyz-timeline-node';
    NODE.entityId = entityId;
    NODE.date = date;

    DIV.appendChild(NODE);

    const LABEL = document.createElement('DIV');
    LABEL.classList.add('xyz-timeline-label');
    if (display.isSelected() || display.getOption('default') === entityId) {
      LABEL.classList.add('xyz-list-selected');
    }

    LABEL.entityId = entityId;
    const TAG_date = dateNode.render(display.getAction(), display.getSubOptions(datePropertyName));
    const TAG_label = labelNode.render(display.getAction(), display.getSubOptions(labelPropertyName));
    const DIV_date = document.createElement('DIV');
    DIV_date.style.fontSize = '0.5em';
    DIV_date.appendChild(TAG_date);
    LABEL.appendChild(DIV_date);
    LABEL.appendChild(TAG_label);
    LABEL.date = date;
    if (display.hasOption('select')) {
      LABEL.onclick = () => display.select();
    }

    DIV.appendChild(LABEL);

    const CONNECTOR = document.createElement('DIV');
    CONNECTOR.className = 'xyz-timeline-connector';
    CONNECTOR.entityId = display.getEntityId();
    CONNECTOR.LABEL = LABEL;
    CONNECTOR.NODE = NODE;
    DIV.appendChild(CONNECTOR);
    if (display.hasOption('color')) {
      const color = display.getColor();
      NODE.style.backgroundColor = color;
      LABEL.style.backgroundColor = color;
      CONNECTOR.style.backgroundColor = color;
    }
    // TODO add a listener for changes on this node
    drawNodes(DIV, display);
  },
  remove: display => {
    const WRAPPER = display.getWRAPPER();
    const entityId = display.getEntityId();
    const DIV = WRAPPER.firstChild;
    for (const NODE of DIV.childNodes) {
      if (typeof NODE.entityId === 'string' && (NODE.entityId === entityId || entityId === '*')) DIV.removeChild(NODE);
    }
    drawNodes(DIV, display);
  }
};
