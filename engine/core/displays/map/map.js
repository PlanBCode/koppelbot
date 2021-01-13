const xmlns = "http://www.w3.org/2000/svg";

const list = require('../list/list.js');

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
        // Nb this does not seem to work const SVG_map =  document.createElementNS(xmlns,'SVG');
        // using innerHTML instead
        WRAPPER.innerHTML='<svg class="xyz-map-wrapper" width="500" height="500"></svg>'; //TODO handle size
        const SVG_map =  WRAPPER.firstChild;
        const locationPropertyName = display.getOption('location') || 'geojson';

        const DIV_create = list.showCreateButton(display);
        if(DIV_create){
          SVG_map.onclick = event => {
            const rect = SVG_map.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientX - rect.top;
            //TODO use transformation
            DIV_create.patch({[locationPropertyName]:{"type": "Point", "coordinates": [x, y]}})
            DIV_create.style.display = 'block';
          }
        }
        //TODO window.addEventListener("resize", () => drawNodes(DIV, display));
    },

    entity: display => {
        const content = display.getContent();
        const locationPropertyName = display.getOption('location') || 'geojson';
        // TODO maybe const labelPropertyName = display.getOption('label')||'title'; //TODO

        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();
        const uri = '/' + entityClassName + '/' + entityId;
        const WRAPPER = display.getWRAPPER();
        const SVG_map = WRAPPER.firstChild;

        if(typeof content !== 'object' || content === null || !content.hasOwnProperty(locationPropertyName)) return;
        // TODO maybe const SPAN_label = content[labelPropertyName].render(display.getAction(), display.getSubOptions(labelPropertyName));
        // TODO maybe pass label to svg entity?
        const SVG_entity = content[locationPropertyName].render(display.getAction(), {svg: true, ...display.getSubOptions(locationPropertyName)});
        SVG_entity.onclick = event => {
          display.select(entityClassName, entityId);
          event.stopPropagation();
          return false;
        }
        if(display.hasOption('select')) SVG_entity.style.cursor='pointer';

        SVG_map.appendChild(SVG_entity);

        // TODO Maybe SVG_map.appendChild(SPAN_label);

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
