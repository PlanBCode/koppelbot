const xmlns = "http://www.w3.org/2000/svg";

//TODO const list = require('../list/list.js');

exports.display = {
    waitingForInput: display => {
        display.getWRAPPER().innerHTML = 'Waiting for input...';
    },
    waitingForData: display => {
       //TODO display map?
       display.getWRAPPER().innerHTML = 'Waiting for data...';
    },
    empty: display => {
       //TODO display map?
        display.getWRAPPER().innerHTML = 'No items to display.';
    },
    first: display => {
        const WRAPPER = display.getWRAPPER();
        const SVG_map =  document.createElementNS(xmlns,'SVG');
        WRAPPER.innerHTML='<svg class="xyz-map-wrapper" width="500" height="500"></svg>'; //TODO handle size

        //TODO maybe list.showCreateButton(display);
        //TODO window.addEventListener("resize", () => drawNodes(DIV, display));
    },

    entity: display => {
        const content = display.getContent();
        const locationPropertyName = display.getOption('location') || 'geojson';

        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();
        const uri = '/' + entityClassName + '/' + entityId;
        const WRAPPER = display.getWRAPPER();
        const SVG_map = WRAPPER.firstChild;

        if(typeof content !== 'object' || content === null || !content.hasOwnProperty(locationPropertyName)) return;

        const SVG_entity = content[locationPropertyName].render(display.getAction(), {svg: true,...display.getSubOptions(locationPropertyName)});
        SVG_map.appendChild(SVG_entity);

    },
    remove: display => {
        const WRAPPER = display.getWRAPPER();
        const entityId = display.getEntityId();
        const DIV = WRAPPER.firstChild;
        for (let NODE of DIV.childNodes) {
            if (typeof NODE.entityId === 'string' && (NODE.entityId === entityId || entityId === '*')) DIV.removeChild(NODE);
        }
        drawNodes(DIV, display);
    }
};
