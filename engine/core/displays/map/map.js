/* global ol */

/*
TODO?label  define a label property to use
 */
exports.zoomTo = zoomTo;

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
    if (geometryType === 'Point') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          stroke: new ol.style.Stroke({color: strokeColor, width: strokeWidth}),
          radius: 5,
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

function checkMaxDimension (display, extent) {
  const WRAPPER = display.getWRAPPER();
  const BUTTON_zoomout = WRAPPER.getElementsByClassName('ol-zoom-out')[0];
  if (!display.hasOption('maxAllowedViewSize')) {
    BUTTON_zoomout.removeAttribute('disabled');
  } else {
    const width = Math.abs(extent[2] - extent[0]);
    const height = Math.abs(extent[3] - extent[1]);
    const maxDimension = Math.max(width, height);
    const maxAllowedDimension = display.getOption('maxAllowedViewSize');
    if (maxAllowedDimension > maxDimension) {
      BUTTON_zoomout.removeAttribute('disabled');
    } else {
      BUTTON_zoomout.setAttribute('disabled', true);
    }
  }
}

function limitExtent (display, extent) {
  if (!display.hasOption('maxAllowedViewSize')) return false;
  const width = Math.abs(extent[2] - extent[0]);
  const height = Math.abs(extent[3] - extent[1]);
  const maxDimension = Math.max(width, height);
  const maxAllowedDimension = display.getOption('maxAllowedViewSize');
  if (maxDimension > maxAllowedDimension) { // View is too large
    const centerX = extent[0] + width * 0.5;
    const centerY = extent[1] + height * 0.5;
    if (maxDimension === width) { // need to crop horizontally
      extent[0] = centerX - maxAllowedDimension * 0.5;
      extent[2] = centerX + maxAllowedDimension * 0.5;
      extent[1] = centerY - maxAllowedDimension * 0.5 * height / width;
      extent[3] = centerY + maxAllowedDimension * 0.5 * height / width;
    } else { // need to crop vertically
      extent[0] = centerX - maxAllowedDimension * 0.5 * width / height;
      extent[2] = centerX + maxAllowedDimension * 0.5 * width / height;
      extent[1] = centerY - maxAllowedDimension * 0.5;
      extent[3] = centerY + maxAllowedDimension * 0.5;
    }
    return true;
  } else return false;
}

function zoomTo (extent, display) {
  const WRAPPER = display.getWRAPPER();
  const padding = 0; // 100
  limitExtent(display, extent);
  checkMaxDimension(display, extent);
  WRAPPER.map.getView().fit(extent, {padding: [padding, padding, padding, padding]});
}

function zoomToFit (display) {
  const WRAPPER = display.getWRAPPER();
  const extent = ol.extent.createEmpty();
  ol.extent.extend(extent, WRAPPER.vectorLayer.getSource().getExtent());
  zoomTo(extent, display);
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
          zoomTo(extent, display);
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
      if(highlightedFeature.displayItem) highlightedFeature.displayItem.unhighlight();

      const resolution = 10; // TODO
      const style1 = highlightedFeature.getStyle();
      const style = typeof style1 === 'function'
        ? style1(highlightedFeature, resolution)
        : style1;
      const fill = style.getFill();
      if (fill) {
        const fillColor = fill.getColor();
        const strokeColor = WRAPPER.selectedFeature === highlightedFeature ? HIGHLIGHT_COLOR : fillColor;
        setFeatureStyle(WRAPPER, highlightedFeature, fillColor, strokeColor, 3);
      }
      highlightedFeature = null;
    }
    map.forEachFeatureAtPixel(e.pixel, feature => {
      if (highlightedFeature === feature) return true;

      highlightedFeature = feature;
      if(highlightedFeature.displayItem) highlightedFeature.displayItem.highlight();

      const resolution = 10; // TODO
      const style1 = feature.getStyle();
      const style = typeof style1 === 'function'
        ? style1(highlightedFeature, resolution)
        : style1;

      const fill = style.getFill();
      if (fill) {
        const fillColor = fill.getColor();
        const strokeColor = HIGHLIGHT_COLOR;
        setFeatureStyle(WRAPPER, feature, fillColor, strokeColor, 3);
      }
      return true;
    });
  });

  const BUTTON_zoomin = document.getElementsByClassName('ol-zoom-in')[0];
  const BUTTON_zoomout = document.getElementsByClassName('ol-zoom-out')[0];
  BUTTON_zoomout.title = 'Zoom out';
  BUTTON_zoomin.title = 'Zoom in';
  if (!display.hasOption('showFitToDataButton') || display.getOption('showFitToDataButton')) {
    const BUTTON_zoomfit = document.createElement('button');
    BUTTON_zoomfit.innerHTML = '&boxplus;';
    BUTTON_zoomfit.className = 'ol-zoom-fit';
    BUTTON_zoomfit.title = 'Zoom to fit';
    BUTTON_zoomfit.onclick = () => {
      delete WRAPPER.zoomToFit; // remove zoom to fit limitation
      zoomToFit(display);
    };
    const DIV_buttons = BUTTON_zoomin.parentNode;
    DIV_buttons.insertBefore(BUTTON_zoomfit, BUTTON_zoomin);
  }
  renderMarkUserLocation(display, ol, DIV_create);
  renderSearchBar(display, ol);

  if (display.hasOption('viewBoxSelect')) {
    const variableName = display.getOption('viewBoxSelect');
    let busy = false;
    map.on('moveend', () => {
      if (busy) return;
      busy = true;
      const extent = WRAPPER.map.getView().calculateExtent().map(Math.round);
      const tooLarge = limitExtent(display, extent);
      if (tooLarge) {
        busy = false;
        zoomTo(extent, display);
      } else {
        checkMaxDimension(display, extent);
        display.setVariable(variableName, extent.join(','));
        busy = false;
      }
    });
    const onChange = value => {
      WRAPPER.zoomToFit = false; // prevent zoom to fit overriding variable data
      if (busy) return;
      busy = true;
      if (typeof value !== 'string') return;
      const extent = value.split(',').map(Number);
      zoomTo(extent, display);
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
    if (WRAPPER.vectorSource){ // clean up
      const features = WRAPPER.vectorSource.getFeatures();
      for(const feature of features) if(feature.displayItem) feature.displayItem.remove();
      WRAPPER.vectorSource.clear();
     }
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
          feature.displayItem = displayItem;

          feature.onclick = () => {
            if (WRAPPER.selectedFeature) setStyle(false, WRAPPER.selectedFeature); // deselect previous selection
            setStyle(true);
            displayItem.select();
          };

          displayItem.onHighlight(
            () => setStyle(true),
            () => setStyle(false),
          )



          // TODO const SVG_entity = content[locationPropertyName].render(display.getAction(), {...display.getSubOptions(locationPropertyName), color, svg: true});
          // TODO how do we handle changes to feature?
          WRAPPER.vectorLayer.getSource().addFeature(feature);
          if (WRAPPER.zoomToFit !== false) zoomToFit(displayItem);
        }
      }
    });
  },
  remove: displayItem => {
    //const WRAPPER = displayItem.getWRAPPER();
    //const entityId = displayItem.getEntityId();
    // TODO
  }
};
