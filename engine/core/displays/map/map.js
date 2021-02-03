/*
?label  define a label property to use

 */
const xmlns = 'http://www.w3.org/2000/svg';

const list = require('../list/list.js');

exports.display = {
  waitingForInput: display => {
    display.getWRAPPER().innerHTML = 'Waiting for input...';
  },
  waitingForData: display => {
    // TODO display map?
    display.getWRAPPER().innerHTML = 'Waiting for data...';
  },
  empty: display => {
    const WRAPPER = display.getWRAPPER();
    WRAPPER.innerHTML = '<svg class="xyz-map-wrapper" width="500" height="500"></svg>'; // TODO handle size
    // Nb this does not seem to work const SVG_map =  document.createElementNS(xmlns,'SVG');
    // using innerHTML instead
    const SVG_map = WRAPPER.firstChild;
    const locationPropertyName = display.getOption('location') || 'geojson';

    const DIV_create = display.showCreateButton();

    const markUserLocation = locationResponse => {
      const x = locationResponse.coords.latitude; // TODO transform
      const y = locationResponse.coords.latitude; // TODO transform
      const radius = locationResponse.coords.accuracy; // TODO transform
      const SVG_userLocation = document.createElementNS(xmlns, 'circle');
      SVG_userLocation.setAttributeNS(null, 'cx', x);
      SVG_userLocation.setAttributeNS(null, 'cy', y);
      SVG_userLocation.setAttributeNS(null, 'r', radius);
      SVG_userLocation.setAttributeNS(null, 'fill', 'blue');
      SVG_userLocation.setAttributeNS(null, 'stroke', 'white');
      SVG_map.appendChild(SVG_userLocation);
      if (DIV_create) {
        SVG_userLocation.onclick = event => {
          DIV_create.patch({[locationPropertyName]: {'type': 'Point', 'coordinates': [x, y]}});
          DIV_create.style.display = 'block';
          event.stopPropagation();
          return false;
        };
        SVG_userLocation.style.cursor = 'pointer';
      }
    };
    if (display.getOption('markUserLocation')) {
      markUserLocation({coords: {accuracy: 20, latitude: 352, longitude: 340}});
      // TODO enable navigator.geolocation.getCurrentPosition(markUserLocation, error=>{
      // console.error(error);//TOOD
      // });
    }

    if (DIV_create) {
      SVG_map.onclick = event => {
        const rect = SVG_map.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // TODO use transformation
        DIV_create.patch({[locationPropertyName]: {'type': 'Point', 'coordinates': [x, y]}});
        DIV_create.style.display = 'block';
      };
    }
  },
  first: display => {},

  entity: display => {
    const content = display.getContent();
    const locationPropertyName = display.getOption('location') || 'geojson';
    // TODO maybe const labelPropertyName = display.getOption('label')||'title'; //TODO

    const entityId = display.getEntityId();
    const entityClassName = display.getEntityClassName();
    const uri = '/' + entityClassName + '/' + entityId;
    const WRAPPER = display.getWRAPPER();
    const SVG_map = WRAPPER.firstChild;

    if (typeof content !== 'object' || content === null || !content.hasOwnProperty(locationPropertyName)) return;
    // TODO maybe const SPAN_label = content[labelPropertyName].render(display.getAction(), display.getSubOptions(labelPropertyName));
    // TODO maybe pass label to svg entity?
    const color = display.getColor();
    const SVG_entity = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, svg: true});
    SVG_entity.entityId = entityId;
    SVG_entity.onclick = event => {
      display.select(entityClassName, entityId);
      event.stopPropagation();
      return false;
    };
    if (display.hasOption('select')) SVG_entity.style.cursor = 'pointer';

    SVG_map.appendChild(SVG_entity);

    // TODO Maybe SVG_map.appendChild(SPAN_label);
  },
  remove: display => {
    const WRAPPER = display.getWRAPPER();
    const entityId = display.getEntityId();
    const SVG_map = WRAPPER.firstChild;
    for (let SVG_entity of SVG_map.childNodes) {
      if (typeof SVG_entity.entityId === 'string' && (SVG_entity.entityId === entityId || entityId === '*')) SVG_map.removeChild(SVG_entity);
    }
  }
};
