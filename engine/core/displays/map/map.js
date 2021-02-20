/* global ol */

/*
TODO?label  define a label property to use
- mark user location

 */

let SCRIPT; // to dynamically load dependency;

function initializeMap (display) {
  const WRAPPER = display.getWRAPPER();
  WRAPPER.className = 'xyz-map';

  if (WRAPPER.vectorLayer) { // map is already created, to reinitialize we clear all features
    const DIV_message = WRAPPER.firstChild;
    DIV_message.innerText = 'Waiting for input...';
    WRAPPER.vectorSource.clear();
    return;
  }

  const vectorSource = new ol.source.Vector({
    features: []
  });
  WRAPPER.vectorSource = vectorSource;

  WRAPPER.innerHTML = '';
  const DIV_message = document.createElement('DIV');
  DIV_message.className = 'xyz-map-message';
  DIV_message.innerText = 'Waiting for input...';
  WRAPPER.appendChild(DIV_message);
  WRAPPER.style.height = '500px';
  WRAPPER.style.width = '100%';

  const vectorLayer = new ol.layer.Vector({
    source: vectorSource
  });
  WRAPPER.vectorLayer = vectorLayer;

  const rasterLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });

  const map = new ol.Map({
    theme: null,
    layers: [rasterLayer, vectorLayer],
    target: WRAPPER,
    view: new ol.View({ // TODO parametrize
      center: [0, 0],
      zoom: 3
    })
  });
  WRAPPER.map = map;
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

    const pixel = map.getEventPixel(e.originalEvent);
    const hit = map.hasFeatureAtPixel(pixel);

    map.getTarget().style.cursor = hit ? 'pointer' : ''; // TODO only if feature has onclick
  });

  const locationPropertyName = display.getOption('location') || 'geojson';

  const markUserLocation = locationResponse => {
    const format = new ol.format.GeoJSON(); // TODO parametrize
    const data = {type: 'Feature', geometry: {type: 'Point', coordinates: [locationResponse.coords.latitude, locationResponse.coords.longitude]}, properties: null};

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
    iconFeature.onclick = () => display.select();

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
  const BUTTON_zoomin = document.getElementsByClassName('ol-zoom-in')[0];
  const BUTTON_zoomfit = document.createElement('button');
  BUTTON_zoomfit.innerHTML = '&boxplus;';
  BUTTON_zoomfit.className = 'ol-zoom-fit';
  BUTTON_zoomfit.onclick = () => zoomToFit(WRAPPER);
  const DIV_buttons = BUTTON_zoomin.parentNode;
  DIV_buttons.insertBefore(BUTTON_zoomfit, BUTTON_zoomin);
}

function initializeOpenLayers (callback) {
  if (!SCRIPT) {
    SCRIPT = document.createElement('script');
    SCRIPT.src = 'https://openlayers.org/en/v6.5.0/build/ol.js';
    SCRIPT.onload = callback;
    document.head.append(SCRIPT);
  } else callback();
}

function zoomToFit (WRAPPER) {
  const extent = ol.extent.createEmpty();
  ol.extent.extend(extent, WRAPPER.vectorLayer.getSource().getExtent());
  WRAPPER.map.getView().fit(extent, WRAPPER.map.getSize());
}

exports.display = {
  waitingForInput: displayItem => {
    initializeOpenLayers(() => initializeMap(displayItem));
  },
  waitingForData: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const DIV_message = WRAPPER.firstChild;
    if (DIV_message) DIV_message.innerText = 'Waiting for data...';
  },
  empty: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const DIV_message = WRAPPER.firstChild;
    if (DIV_message) DIV_message.innerText = '';
    if (WRAPPER.vectorSource) WRAPPER.vectorSource.clear();
  },

  first: displayItem => {},

  entity: displayItem => {
    initializeOpenLayers(() => {
      const locationPropertyName = displayItem.getOption('location') || 'geojson';
      const WRAPPER = displayItem.getWRAPPER();
      const DIV_message = WRAPPER.firstChild;
      if (DIV_message) DIV_message.innerText = '';

      // TODO maybe const SPAN_label = content[labelPropertyName].render(display.getAction(), display.getSubOptions(labelPropertyName));
      // TODO maybe pass label to svg entity?

      /* const feature = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, display: 'map'});
    feature.onclick = () => display.select();

    WRAPPER.vectorLayer.getSource().addFeature(feature);
    return; */
      const format = new ol.format.GeoJSON(); // TODO parametrize
      const data = displayItem.getNode(locationPropertyName).getContent();

      if (data) {
        const features = format.readFeatures(data);
        const feature = features[0]; // TODO handle multiple features?
        if (feature) { // TODO check
          if (data.geometry.type === 'Point') {
            // https://openlayers.org/en/latest/examples/polygon-styles.html
            const color = displayItem.getColor();
            const style = new ol.style.Style({
              image: new ol.style.Circle({
                radius: 5,
                fill: new ol.style.Fill({
                  color
                })
              })
            });
            feature.setStyle(style);
          } else {
            const color = displayItem.getColor();
            const style = new ol.style.Style({
              stroke: new ol.style.Stroke({
                color,
                width: 1
              }),
              fill: new ol.style.Fill({
                color
              })
            });
            feature.setStyle(style);
          }
          /*
        fillColor
        fillOpacity
        strokeColor
        strokeOpacity
        strokeWidth
        strokeLinecap
        strokeDashstyle */

          // TODO if feature is point
          // const color = display.getColor();
          /* feature.setStyle(
          new ol.style.Style({
            image: new ol.style.Icon({
              color,
              crossOrigin: 'anonymous',
              src: 'vanwieisdestad/bigdot.png', // TODO parametrize
              scale: 0.2 // TODO parametrize
            })
          })
        ); */
          feature.onclick = () => displayItem.select();

          // TODO const SVG_entity = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, svg: true});
          // TODO how do we handle changes to feature?
          WRAPPER.vectorLayer.getSource().addFeature(feature);

          zoomToFit(WRAPPER);
        }
      }
    });
  },
  remove: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const entityId = displayItem.getEntityId();
    // TODO
  }
};
