const VIEWBOX_PADDING_M = 100000; // viewBox padding in meters

exports.renderSearchBar = renderSearchBar;

const {zoomTo} = require('../map.js');

// find only items in this viewbox
function getViewBoxQuery (WRAPPER, ol) {
  const mapExtent = WRAPPER.map.getView().calculateExtent();
  mapExtent[0] -= VIEWBOX_PADDING_M;
  mapExtent[1] -= VIEWBOX_PADDING_M;
  mapExtent[2] += VIEWBOX_PADDING_M;
  mapExtent[3] += VIEWBOX_PADDING_M;

  const mapTopLeft = ol.proj.transform([mapExtent[0], mapExtent[1]], 'EPSG:3857', 'EPSG:4326');
  const mapBottomRight = ol.proj.transform([mapExtent[2], mapExtent[3]], 'EPSG:3857', 'EPSG:4326');
  return mapTopLeft.concat(mapBottomRight).join(',');
}

function renderResults (results, WRAPPER, DIV_results) {
  DIV_results.style.display = 'block';
  if (results.length === 0) {
    DIV_results.innerHTML = '<i>&nbsp;No results...</i>';
    return;
  }
  DIV_results.innerHTML = '';
  for (const result of results) {
    const DIV_result = document.createElement('DIV');
    DIV_results.appendChild(DIV_result);
    DIV_result.className = 'xyz-map-search-result';
    DIV_result.innerHTML = result.display_name + ' (' + Math.round(result.distance / 1000) + 'km)';
    DIV_result.onclick = () => {
      DIV_results.style.display = 'none';
      WRAPPER.map.getView().fit(result.extent, {padding: [100, 100, 100, 100]});
    };
  }
}

function normalizeResults (WRAPPER, results, ol) {
  const mapCenter = WRAPPER.map.getView().getCenter();
  const format = new ol.format.GeoJSON();

  results.forEach(result => {
    const boundingBox = result.boundingbox.map(Number);
    const coordinates = [
      ol.proj.transform([boundingBox[2], boundingBox[0]], 'EPSG:4326', 'EPSG:3857'),
      ol.proj.transform([boundingBox[3], boundingBox[1]], 'EPSG:4326', 'EPSG:3857')
    ];
    const data = {type: 'Feature', geometry: {type: 'MultiPoint', coordinates}, properties: null};
    const features = format.readFeatures(data);
    const extent = features[0].getGeometry().getExtent();//
    const featureCener = [(extent[0] + extent[2]) * 0.5, (extent[1] + extent[3]) * 0.5];
    const dx = featureCener[0] - mapCenter[0];
    const dy = featureCener[1] - mapCenter[1];
    const distance = Math.hypot(dx, dy);
    result.distance = distance;
    result.importance = result.importance - Math.round(result.distance / 100); // add distance to importance comparison
    result.extent = extent;
  });
  results.sort((a, b) => b.importance - a.importance);
}

let busy = false;
let checkAgain = false;
let checkTimeout = null;
let fireWhenReady = false;

function getSearchResults (display, ol, query, dataCallback, errorCallback) {
  const WRAPPER = display.getWRAPPER();
  if (display.hasOption('searchContext')) query += '+' + display.getOption('searchContext');
  const xhr = new window.XMLHttpRequest();
  query = query.replace(/\s/g, '+');
  // https://nominatim.org/release-docs/develop/api/Search/
  const viewBoxQuery = getViewBoxQuery(WRAPPER, ol);
  const searchUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&polygon_geojson=1&addressdetails=1&viewbox=${viewBoxQuery}&bounded=1`;
  xhr.open('GET', searchUrl, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        let results;
        try {
          results = JSON.parse(xhr.responseText);
        } catch (e) {
          return errorCallback('Failed to parse result JSON');
        }
        normalizeResults(WRAPPER, results, ol);
        return dataCallback(results);
      } else return errorCallback(xhr.responseText);
    }
  };
  xhr.send();
}

function updateSearchResults (INPUT_search, display, WRAPPER, ol, DIV_results) {
  if (INPUT_search.value.length < 4) return;
  if (busy) {
    checkAgain = true;
    return;
  }
  busy = true;
  getSearchResults(display, ol, INPUT_search.value, results => {
    renderResults(results, WRAPPER, DIV_results);

    if (checkAgain) { // changes have been made, check again.
      if (checkTimeout) return; // already checking Again
      checkTimeout = setTimeout(() => {
        busy = false;
        checkTimeout = null;
        checkAgain = false;
        updateSearchResults(INPUT_search, display, WRAPPER, ol, DIV_results);
      }, 500);
    } else {
      busy = false; // done
      if (fireWhenReady) { // return has been pressed, show first result
        fireWhenReady = false;
        if (DIV_results.firstChild && DIV_results.firstChild.tagName === 'DIV') DIV_results.firstChild.onclick();
      }
    }
  }, error => {
    busy = false;
  });
}

function renderSearchBar2 (display, ol, DIV_search) {
  const WRAPPER = display.getWRAPPER();
  const INPUT_search = document.createElement('INPUT');
  const DIV_results = document.createElement('DIV');
  DIV_results.style.display = 'none';
  DIV_results.className = 'xyz-map-search-results';
  DIV_search.appendChild(INPUT_search);
  DIV_search.appendChild(DIV_results);

  document.addEventListener('click', event => {
    if (DIV_results.style.display === 'none') return;
    let ELEMENT = event.target;
    do {
      if (ELEMENT === DIV_search) return;
      ELEMENT = ELEMENT.parentNode;
    } while (ELEMENT);
    DIV_results.style.display = 'none';
  });

  INPUT_search.placeholder = display.getOption('searchPlaceholder') || 'Search';
  INPUT_search.onkeyup = event => {
    if (event.keyCode === 13) {
      if (busy) fireWhenReady = true;
      else if (DIV_results.firstChild && DIV_results.firstChild.tagName === 'DIV') DIV_results.firstChild.onclick();
    } else updateSearchResults(INPUT_search, display, WRAPPER, ol, DIV_results);
  };
}

function renderSearchPresets (display, ol, DIV_search) {
  const WRAPPER = display.getWRAPPER();
  const SELECT_search = document.createElement('SELECT');
  const placeholder = display.getOption('searchPlaceholder') || 'Select';
  SELECT_search.innerHTML = `<option DISABLED SELECTED value>${placeholder}</option>`;
  const options = display.getOption('searchPresets').split(',');
  options.sort();
  for (const option of options) {
    const [title, value] = option.includes('=')
      ? option.split('=')
      : [option, option];
    const OPTION = document.createElement('OPTION');
    OPTION.innerHTML = title.trim();
    OPTION.value = value.trim();
    SELECT_search.appendChild(OPTION);
  }

  SELECT_search.onchange = () => {
    getSearchResults(display, ol, SELECT_search.value,
      results => {
        if (results.length > 0) {
          WRAPPER.map.getView().fit(results[0].extent, {padding: [100, 100, 100, 100]});
        } else {
          console.error('No results for ', SELECT_search.value);
        }
      },
      console.error);
  };
  DIV_search.appendChild(SELECT_search);
}

function renderSearchBar (display, ol) {
  const WRAPPER = display.getWRAPPER();
  if (display.getOption('showSearchBar') !== false || display.hasOption('searchPresets')) {
    const DIV_search = document.createElement('DIV');
    DIV_search.className = 'xyz-map-search';

    if (display.hasOption('searchPresets')) renderSearchPresets(display, ol, DIV_search);
    else renderSearchBar2(display, ol, DIV_search);

    WRAPPER.appendChild(DIV_search);
  }
}
