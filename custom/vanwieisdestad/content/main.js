function onLoad () {
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
