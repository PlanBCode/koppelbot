/* global ol */

/*
TODO?label  define a label property to use
 */
const {getStateMessage} = require('../item/item');
const {renderSearchBar} = require('./search/search');
const {renderMarkUserLocation} = require('./markUserLocation/markUserLocation');

const HIGHLIGHT_COLOR = 'yellow';
const MINIMAL_PIXEL_DIMENSION = 15; // features smaller than this will be represented by a circle

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
    // console.log('resolution', minPixelSize);

    if (geometryType === 'Point') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          stroke: new ol.style.Stroke({color: strokeColor, width: strokeWidth}),
          radius: 50,
          fill: new ol.style.Fill({color: fillColor})
        })
      });
    } else {
      const extent = feature.getGeometry().getExtent();
      const pixelTopLeft = WRAPPER.map.getPixelFromCoordinate(ol.extent.getTopLeft(extent));
      const pixelBottomRight = WRAPPER.map.getPixelFromCoordinate(ol.extent.getBottomRight(extent));

      const pixelWidth = pixelBottomRight[0] - pixelTopLeft[0];
      const pixelHeight = pixelBottomRight[1] - pixelTopLeft[1];

      if (pixelWidth < MINIMAL_PIXEL_DIMENSION || pixelHeight < MINIMAL_PIXEL_DIMENSION) {
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
      const locationPropertyName = display.getOption('location') || 'geojson';
      DIV_create.patch({[locationPropertyName]: {type: 'Point', coordinates: event.coordinate}});
      DIV_create.style.display = 'block';
    }
    event.stopPropagation();
    return false;
  });

  let highlightedFeature = null;
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
      const resolution = 10; // TODO
      const fillColor = highlightedFeature.getStyle()(highlightedFeature, resolution).getFill().getColor();
      const strokeColor = WRAPPER.selectedFeature === highlightedFeature ? HIGHLIGHT_COLOR : fillColor;
      setFeatureStyle(WRAPPER, highlightedFeature, fillColor, strokeColor, 3);
      highlightedFeature = null;
    }
    map.forEachFeatureAtPixel(e.pixel, feature => {
      if (highlightedFeature === feature) return true;
      highlightedFeature = feature;
      const resolution = 10; // TODO
      const fillColor = feature.getStyle()(feature, resolution).getFill().getColor();
      const strokeColor = HIGHLIGHT_COLOR;
      setFeatureStyle(WRAPPER, feature, fillColor, strokeColor, 3);
      return true;
    });
  });

  const BUTTON_zoomin = document.getElementsByClassName('ol-zoom-in')[0];
  const BUTTON_zoomout = document.getElementsByClassName('ol-zoom-out')[0];
  const BUTTON_zoomfit = document.createElement('button');
  BUTTON_zoomfit.innerHTML = '&boxplus;';
  BUTTON_zoomfit.className = 'ol-zoom-fit';
  BUTTON_zoomout.title = 'Zoom out';
  BUTTON_zoomin.title = 'Zoom in';
  BUTTON_zoomfit.title = 'Zoom to fit';
  BUTTON_zoomfit.onclick = () => {
    delete WRAPPER.zoomToFit; // remove zoom to fit limitation
    zoomToFit(WRAPPER);
  };
  const DIV_buttons = BUTTON_zoomin.parentNode;
  DIV_buttons.insertBefore(BUTTON_zoomfit, BUTTON_zoomin);
  renderMarkUserLocation(display, ol, DIV_create);
  renderSearchBar(display, ol);

  if (display.hasOption('viewBoxSelect')) {
    const variableName = display.getOption('viewBoxSelect');
    let busy = false;
    map.on('moveend', () => {
      if (busy) return;
      busy = true;
      const mapExtent = WRAPPER.map.getView().calculateExtent().map(Math.round);
      display.setVariable(variableName, mapExtent.join(','));
      busy = false;
    });
    const onChange = value => {
      WRAPPER.zoomToFit = false; // prevent zoom to fit overriding variable data
      if (busy) return;
      busy = true;
      if (typeof value !== 'string') return;
      const extent = value.split(',').map(Number);
      WRAPPER.map.getView().fit(extent);
      busy = false;
    };

    display.onVariable(variableName, onChange);
    if (display.hasVariable(variableName)) onChange(display.getVariable(variableName));
  }
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
            const strokeColor = isSelected ? HIGHLIGHT_COLOR : fillColor;
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
          if (WRAPPER.zoomToFit !== false) zoomToFit(WRAPPER);
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
