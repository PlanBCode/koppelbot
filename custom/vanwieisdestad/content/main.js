function onLoad () {
  // Setup Zoom to Amersfoort button
  const DIV = document.getElementById('zoom-to-amersfoort');
  const zoomToAmersfoort = DIV.onclick = () => {
    const WRAPPER = document.getElementById('map');
    if (WRAPPER && WRAPPER.map) {
      WRAPPER.map.getView().setCenter(ol.proj.transform([5.4000, 52.1680], 'EPSG:4326', 'EPSG:3857'));
      WRAPPER.map.getView().setZoom(13);
      return true;
    } else return false;
  };
  const tryZoom = () => setTimeout(() => {
    if (!zoomToAmersfoort()) tryZoom();
  }, 100);
  tryZoom();

  // Setup resize of richt column
  const DIV_resizer = document.getElementById('resizer');
  DIV_resizer.onmousedown = event => {
    document.body.onmouseup = event => {
      const TD_main = document.getElementById('main');
      TD_main.style.width = event.clientX + 'px';
      TD_main.style.minWidth = event.clientX + 'px';
      document.body.onmouseup = null;
      event.stopPropagation();
      return false;
    };
    event.stopPropagation();
    return false;
  };
}
