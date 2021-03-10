/* global ol */

/*
TODO?label  define a label property to use
 */
const {getStateMessage} = require('../item/item');
let SCRIPT; // to dynamically load dependency;

function setFeatureStyle (WRAPPER, feature, fillColor, strokeColor, strokeWidth) {
  /* For future extensions
  fillColor
  fillOpacity
  strokeColor
  strokeOpacity
  strokeWidth
  strokeLinecap
  strokeDashstyle */

  const geometryType = feature.getGeometry().getType();
  const highlightStyle = (feature, resolution) => {
    if (geometryType === 'Point') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          stroke: new ol.style.Stroke({color: strokeColor, width: strokeWidth}),
          radius: 5,
          fill: new ol.style.Fill({color: fillColor})
        })
      });
    } else if (WRAPPER.selectedFeature === feature) {
      const extent = feature.getGeometry().getExtent();

      const topLeft = WRAPPER.map.getPixelFromCoordinate(ol.extent.getTopLeft(extent));
      const bottomRight = WRAPPER.map.getPixelFromCoordinate(ol.extent.getBottomRight(extent));

      const width = bottomRight[0] - topLeft[0];
      const height = bottomRight[1] - topLeft[1];

      if (width < 15 || height < 15) {
        if (!feature.iconFeature) {
          const coord = [];
          coord[0] = (extent[2] - extent[0]) / 2 + extent[0];
          coord[1] = (extent[3] - extent[1]) / 2 + extent[1];
          const point = new ol.geom.Point(coord);
          feature.iconFeature = new ol.Feature({
            geometry: point
          });
          feature.iconFeature.onclick = feature.onclick;
          feature.iconFeature.mainFeature = feature;
          WRAPPER.vectorSource.addFeature(feature.iconFeature);
        }

        feature.iconFeature.setStyle(new ol.style.Style({
          image: new ol.style.Circle({
            opacity: 0,
            stroke: new ol.style.Stroke({color: strokeColor, width: strokeWidth}),
            radius: 5,
            fill: new ol.style.Fill({color: fillColor})
          })
        }));
        return new ol.style.Style();
      } else {
        if (feature.iconFeature) feature.iconFeature.setStyle(new ol.style.Style({}));
        return new ol.style.Style({
          fill: new ol.style.Fill({color: fillColor}),
          stroke: new ol.style.Stroke({color: strokeColor, width: strokeWidth})
        });
      }
    } else {
      if (feature.iconFeature) feature.iconFeature.setStyle(new ol.style.Style({}));
      return new ol.style.Style({
        fill: new ol.style.Fill({color: fillColor}),
        stroke: new ol.style.Stroke({color: strokeColor, width: strokeWidth})
      });
    }
  };
  feature.setStyle(highlightStyle);
}

function initializeMap (display) {
  const WRAPPER = display.getWRAPPER();
  WRAPPER.classList.add('xyz-map');

  if (WRAPPER.vectorLayer) { // map is already created, to reinitialize we clear all features
    const DIV_message = WRAPPER.firstChild;
    DIV_message.innerText = getStateMessage(display, 'waitingForInputMessage');
    WRAPPER.vectorSource.clear();
    return;
  }

  const vectorSource = new ol.source.Vector({
    features: []
  });
  WRAPPER.vectorSource = vectorSource;

  WRAPPER.innerHTML = '';
  display.showUiEditButton();
  const DIV_message = document.createElement('DIV');
  DIV_message.className = 'xyz-map-message';
  DIV_message.innerText = getStateMessage(display, 'waitingForInputMessage');
  WRAPPER.appendChild(DIV_message);

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
  let lastClickTimeStamp;
  map.on('click', event => {
    const feature = map.forEachFeatureAtPixel(event.pixel, feature => feature);
    if (feature) {
      if (lastClickTimeStamp) {
        if (event.originalEvent.timeStamp - 500 <= lastClickTimeStamp) {
          const extent = (feature.mainFeature || feature).getGeometry().getExtent();
          WRAPPER.map.getView().fit(extent, {padding: [100, 100, 100, 100]});
        }
      }
      lastClickTimeStamp = event.originalEvent.timeStamp;
      if (typeof feature.onclick === 'function') feature.onclick();
    } else if (DIV_create) {
      DIV_create.patch({[locationPropertyName]: {type: 'Point', coordinates: event.coordinate}});
      DIV_create.style.display = 'block';
    }
    event.stopPropagation();
    return false;
  });

  let highlightedFeature = null;
  let highlightedFeatureOriginalStyle = null;
  // change mouse cursor when over marker
  map.on('pointermove', function (e) {
    if (e.dragging) return;

    const pixel = map.getEventPixel(e.originalEvent);
    const hit = map.hasFeatureAtPixel(pixel);

    map.getTarget().style.cursor = hit ? 'pointer' : ''; // TODO only if feature has onclick

    let alreadyHighlighted = false;
    map.forEachFeatureAtPixel(e.pixel, feature => {
      if (feature === highlightedFeature) {
        alreadyHighlighted = true;
        return true;
      }
    });
    if (alreadyHighlighted) return;

    if (highlightedFeature !== null) {
      highlightedFeature.setStyle(highlightedFeatureOriginalStyle);
      highlightedFeature = null;
    }
    map.forEachFeatureAtPixel(e.pixel, feature => {
      if (highlightedFeature === feature) return true;
      highlightedFeatureOriginalStyle = feature.getStyle();
      highlightedFeature = feature;
      const fillColor = 'rgba(255,255,0,1)';
      const strokeColor = feature.getStyle && feature.getStyle().getFill ? feature.getStyle().getFill() : 'blue';
      setFeatureStyle(WRAPPER, feature, fillColor, strokeColor, 3);
      return true;
    });
  });

  const locationPropertyName = display.getOption('location') || 'geojson';

  const markUserLocation = locationResponse => {
    const format = new ol.format.GeoJSON(); // TODO parametrize
    const coordinates = [locationResponse.coords.latitude, locationResponse.coords.longitude];
    const data = {type: 'Feature', geometry: {type: 'Point', coordinates}, properties: null};

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
    if (DIV_create) {
      iconFeature.onclick = event => {
        DIV_create.patch({[locationPropertyName]: {type: 'Point', coordinates}});
        DIV_create.style.display = 'block';
        event.stopPropagation();
        return false;
      };
    }

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
  const BUTTON_zoomout = document.getElementsByClassName('ol-zoom-out')[0];
  const BUTTON_zoomfit = document.createElement('button');
  BUTTON_zoomfit.innerHTML = '&boxplus;';
  BUTTON_zoomfit.className = 'ol-zoom-fit';
  BUTTON_zoomout.title = 'Zoom out';
  BUTTON_zoomin.title = 'Zoom in';
  BUTTON_zoomfit.title = 'Zoom to fit';
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
  WRAPPER.map.getView().fit(extent, {padding: [100, 100, 100, 100]});
}

exports.display = {
  waitingForInput: displayItem => {
    initializeOpenLayers(() => initializeMap(displayItem));
  },
  waitingForData: displayItem => {
    const WRAPPER = displayItem.getWRAPPER();
    const DIV_message = WRAPPER.firstChild;
    if (DIV_message) DIV_message.innerText = getStateMessage(displayItem, 'waitingForDataMessage');
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

      const format = new ol.format.GeoJSON(); // TODO parametrize
      const data = displayItem.getNode(locationPropertyName).getContent();

      if (data) {
        const features = format.readFeatures(data);
        const feature = features[0]; // TODO handle multiple features?
        if (feature) { // TODO check
          const fillColor = displayItem.getColor();
          const setStyle = (isSelected, feature_ = feature) => {
            if (isSelected) WRAPPER.selectedFeature = feature_;
            else if (WRAPPER.selectedFeature === feature_) WRAPPER.selectedFeature = null;
            const strokeColor = isSelected ? 'yellow' : fillColor;
            const strokeWidth = isSelected ? 3 : 1;
            setFeatureStyle(WRAPPER, feature_, fillColor, strokeColor, strokeWidth);
          };
          setStyle(displayItem.isSelected());
          feature.onclick = () => {
            if (WRAPPER.selectedFeature) setStyle(false, WRAPPER.selectedFeature); // deselect previous selection
            setStyle(true);
            displayItem.select();
          };

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
