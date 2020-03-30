/*
options:
- key property
- label property
- midLine (0-100) where the midline is located
- horizontal : true|false
TODO
- view  left|right|bottom|top
- year/month/day labels
 */

const list = require('./list.js');
const response = require('../../../factory/js/source/entity/response'); //TODO better solution

function parseDateString(string) {
    const parts = string.split("-"); //TODO use formats.json function or a type.toNumber
    return new Date(parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)).getTime();
}

function sortLabels(A, B) {
    const timeA = parseDateString(A.date);
    const timeB = parseDateString(B.date);
    if (timeA === timeB) {
        return 0;
    } else {
        return timeA < timeB ? -1 : 1;
    }
}

function drawNodes(DIV, display) {
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
    for (let NODE of DIV.childNodes) {
        if (NODE.classList.contains('xyz-timeline-node')) {
            const time = parseDateString(NODE.date);
            minTime = Math.min(minTime, time);
            maxTime = Math.max(maxTime, time);
        } else if (NODE.classList.contains('xyz-timeline-label')) {
            LABELS.push(NODE);
        }
    }
    LABELS.sort(sortLabels);
    for (let NODE of DIV.childNodes) {
        if (NODE.classList.contains('xyz-timeline-node')) {
            const time = parseDateString(NODE.date);
            const ratio = (time - minTime) / (maxTime - minTime);
            NODE.style[top] = Q+'%';
            NODE.style[left] = (ratio * 100) + '%';
        }
    }

    for (let i = 0; i < LABELS.length; ++i) {
        const LABEL = LABELS[i];
        const time = parseDateString(LABEL.date);
        const ratio = (time - minTime) / (maxTime - minTime);

        const sizeDIV = DIV.getBoundingClientRect()[width];
        let rectLABEL = LABEL.getBoundingClientRect();
        const sizeLABEL = rectLABEL[width];
        let position = ratio * sizeDIV;
        if (position + sizeLABEL > sizeDIV) position = sizeDIV - sizeLABEL; //ensure labels do not go out of bounds

        LABEL.style[left] = position + 'px';
        rectLABEL = LABEL.getBoundingClientRect();

        let defaultTop = 40;
        if (i > 0) { // ensure labels do not overlap with previous
            const prevRectLABEL = LABELS[i - 1].getBoundingClientRect();
            if (prevRectLABEL[right] > rectLABEL[left]) {
                defaultTop = prevRectLABEL[bottom] + 20;
            }
        }

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

    //DIV.offsetHeight;
    const rDIV = DIV.getBoundingClientRect();
    let i = 0;
    for (let CONNECTOR of DIV.childNodes) {
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

            ++i;
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
    },
    entity: display => {
        const content = display.getContent();
        const key = display.getOption('key') || 'date'; // TODO
        const date = content.getContent()[key];

        const labelProperty = display.getOption('label') || 'title'; //TOOD
        const label = content.getContent()[labelProperty];

        const WRAPPER = display.getWRAPPER();
        const DIV = WRAPPER.firstChild;
        const NODE = document.createElement('DIV');
        NODE.className = 'xyz-timeline-node';
        NODE.entityId = display.getEntityId();
        NODE.date = date;
        //NODE.innerHTML  = '  hello';
        DIV.appendChild(NODE);

        const LABEL = document.createElement('DIV');
        LABEL.className = 'xyz-timeline-label';
        LABEL.entityId = display.getEntityId();
        LABEL.innerHTML = `<SPAN style="font-size:0.5em;">${date}</SPAN><br/>${label}`;
        LABEL.date = date;
        DIV.appendChild(LABEL);

        const CONNECTOR = document.createElement('DIV');
        CONNECTOR.className = 'xyz-timeline-connector';
        CONNECTOR.entityId = display.getEntityId();
        CONNECTOR.LABEL = LABEL;
        CONNECTOR.NODE = NODE;
        DIV.appendChild(CONNECTOR);
        //TODO add a listener for changes on this node

        drawNodes(DIV, display);
    },
    remove: display => {
        const WRAPPER = display.getWRAPPER();
        const entityId = display.getEntityId();
        const DIV = WRAPPER.firstChild;
        for (let NODE of DIV.childNodes) {
            if (typeof NODE.entityId === 'string' && (NODE.entityId === entityId || entityId === '*')) {
                DIV.removeChild(NODE);
            }
        }
        drawNodes(DIV, display);
    }
};

