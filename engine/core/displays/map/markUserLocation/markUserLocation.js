exports.renderMarkUserLocation = function (display, ol, DIV_create) {
  const WRAPPER = display.getWRAPPER();
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
};
