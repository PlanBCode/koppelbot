/*
TODO?label  define a label property to use
- mark user location

 */
const xmlns = 'http://www.w3.org/2000/svg';

let SCRIPT; // to dynamically load dependency;

function empty (display) {
  const WRAPPER = display.getWRAPPER();
  WRAPPER.innerHTML = '';

  WRAPPER.style.height = '500px';
  WRAPPER.style.width = '100%';

  const vectorSource = new ol.source.Vector({
    features: []
  });

  const vectorLayer = new ol.layer.Vector({
    source: vectorSource
  });
  WRAPPER.vectorLayer = vectorLayer;

  const rasterLayer = new ol.layer.Tile({
    source: new ol.source.TileJSON({
      url: 'https://a.tiles.mapbox.com/v3/aj.1x1-degrees.json?secure=1',
      crossOrigin: ''
    })
  });

  const map = new ol.Map({
    layers: [rasterLayer, vectorLayer],
    target: WRAPPER,
    view: new ol.View({ // TODO parametrize
      center: [0, 0],
      zoom: 3
    })
  });

  const DIV_create = display.showCreateButton();

  map.on('click', function (event) {
    const feature = map.forEachFeatureAtPixel(event.pixel, feature => feature);

    if (feature) {
      if (typeof feature.onclick === 'function') feature.onclick();
    } else if (DIV_create) {
      DIV_create.patch({[locationPropertyName]: {type: 'Point', coordinates: event.coordinate}});
      DIV_create.style.display = 'block';
    }
  });

  // change mouse cursor when over marker
  map.on('pointermove', function (e) {
    if (e.dragging) return;

    let pixel = map.getEventPixel(e.originalEvent);
    let hit = map.hasFeatureAtPixel(pixel);

    map.getTarget().style.cursor = hit ? 'pointer' : ''; // TODO only if feature has onclick
  });

  const locationPropertyName = display.getOption('location') || 'geojson';

  const markUserLocation = locationResponse => {
    const format = new ol.format.GeoJSON(); // TODO parametrize
    const data = {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [ locationResponse.coords.latitude, locationResponse.coords.longitude]}, 'properties': null};

    const features = format.readFeatures(data);

    const iconFeature = features[0];

    iconFeature.setStyle(
      new ol.style.Style({
        image: new ol.style.Icon({
          color: 'lightblue',
          crossOrigin: 'anonymous',
          src: 'vanwieisdestad/bigdot.png', // TODO parametrize
          scale: 0.2 // TODO parametrize
        })
      })
    );
    iconFeature.onclick = () => display.select(entityClassName, entityId);

    // TODO const SVG_entity = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, svg: true});
    // TODO how do we handle changes to feature?
    WRAPPER.vectorLayer.getSource().addFeature(iconFeature);
  };
  if (display.getOption('markUserLocation')) {
    markUserLocation({coords: {accuracy: 20, latitude: 591095.2514266643, longitude: 6816187.834250114}});
    /* navigator.geolocation.getCurrentPosition(markUserLocation, error => {
      console.error(error);// TODO enable when mock is done
    }); */
  }
}

exports.display = {
  waitingForInput: display => {
    display.getWRAPPER().innerHTML = 'Waiting for input...';
  },
  waitingForData: display => {
    // TODO display map?
    display.getWRAPPER().innerHTML = 'Waiting for data...';
  },
  empty: display => {
    if (!SCRIPT) {
      SCRIPT = document.createElement('script');
      SCRIPT.src = 'https://openlayers.org/en/v6.5.0/build/ol.js';
      SCRIPT.onload = () => empty(display);
      document.head.append(SCRIPT);
    } else empty(display);
  },
  first: display => {},

  entity: display => {
    // return;
    const content = display.getContent();
    const locationPropertyName = display.getOption('location') || 'geojson';
    const entityId = display.getEntityId();
    const entityClassName = display.getEntityClassName();
    const uri = '/' + entityClassName + '/' + entityId;
    const WRAPPER = display.getWRAPPER();

    if (typeof content !== 'object' || content === null || !content.hasOwnProperty(locationPropertyName)) return;
    // TODO maybe const SPAN_label = content[labelPropertyName].render(display.getAction(), display.getSubOptions(labelPropertyName));
    // TODO maybe pass label to svg entity?
    const color = display.getColor();

    /* const feature = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, display: 'map'});
    feature.onclick = () => display.select(entityClassName, entityId);

    WRAPPER.vectorLayer.getSource().addFeature(feature);
    return; */
    const format = new ol.format.GeoJSON(); // TODO parametrize
    const data = content[locationPropertyName].getContent();

    const features = format.readFeatures(data);

    const iconFeature = features[0];
    if (iconFeature) { // TODO check
      iconFeature.setStyle(
        new ol.style.Style({
          image: new ol.style.Icon({
            color,
            crossOrigin: 'anonymous',
            src: 'vanwieisdestad/bigdot.png', // TODO parametrize
            scale: 0.2 // TODO parametrize
          })
        })
      );
      iconFeature.onclick = () => display.select(entityClassName, entityId);

      // TODO const SVG_entity = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, svg: true});
      // TODO how do we handle changes to feature?
      WRAPPER.vectorLayer.getSource().addFeature(iconFeature);
    }
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
