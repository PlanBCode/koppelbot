exports.renderSearchBar = function (display, ol) {
  const WRAPPER = display.getWRAPPER();
  if (display.getOption('showSearchBar') !== false) {
    const INPUT_search = document.createElement('INPUT');
    INPUT_search.className = 'xyz-map-search';
    INPUT_search.placeholder = display.getOption('searchPlaceholder') || 'Search';
    INPUT_search.onkeyup = event => {
      if (event.keyCode !== 13) return;
      const xhr = new window.XMLHttpRequest();
      const query = INPUT_search.value
        .replace(/\s/g, '+');
      const searchUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&polygon_geojson=1&addressdetails=1`;
      xhr.open('GET', searchUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            let results;
            try {
              results = JSON.parse(xhr.responseText);
            } catch (e) {
            // TODO
              return;
            }
            // for (const result of results) {
            // TODO find the one closest to  map.getView().getCenter()
            // }
            const boundingBox = results[0].boundingbox.map(Number);
            const coordinates = [
              ol.proj.transform([boundingBox[2], boundingBox[0]], 'EPSG:4326', 'EPSG:3857'),
              ol.proj.transform([boundingBox[3], boundingBox[1]], 'EPSG:4326', 'EPSG:3857')
            ];
            const format = new ol.format.GeoJSON();
            const data = {type: 'Feature', geometry: {type: 'MultiPoint', coordinates}, properties: null};
            const features = format.readFeatures(data);
            const extent = features[0].getGeometry().getExtent();//
            WRAPPER.map.getView().fit(extent, {padding: [100, 100, 100, 100]});
          } else {
          // TODO
          }
        }
      };
      xhr.send();
    };
    //
    //
    WRAPPER.appendChild(INPUT_search);
  }
};
