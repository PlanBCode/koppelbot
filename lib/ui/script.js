function request(method, uri, data, dataCallback, errorCallback) {

    const xhr = new XMLHttpRequest();
    xhr.open(method, window.location.href + uri + '?code', true);

    xhr.onreadystatechange = e => {
        if (xhr.readyState === 4) {
            //      if (xhr.status >= 200 && xhr.status <= 299) {
//      console.log(xhr.responseText)
            dataCallback(xhr.responseText)
        }
    };
    xhr.send(data);
}

function ui(uri, options) {
    options = options || {};
    const SCRIPT = document.currentScript;
    request('GET', 'ui' + uri, undefined, content => {
        const DIV = document.createElement('DIV');
        DIV.innerHTML = content;
        DIV.drillDown = options.drillDown;
        SCRIPT.parentNode.insertBefore(DIV, SCRIPT);
        SCRIPT.parentNode.removeChild(SCRIPT);
    })
}

function drillDown(variable, value) {
    //TODO update variable
    console.log(variable, value);
}

function eventDrillDown(event, entityId) {
    let element = event.target;
    let listItemElement;
    while (element) {
        if(element.classList.contains('list-item')){
            listItemElement = element;
        }
        if (element.drillDown) {
            if(listItemElement) {
                for (let sibling of listItemElement.parentNode.children) {
                    if (sibling === listItemElement) {
                        sibling.classList.add('drillDown');
                    } else {
                        sibling.classList.remove('drillDown');
                    }
                }
            }
            drillDown(element.drillDown, entityId);
            return;
        } else {
            element = element.parentNode;
        }
    }
}

const xyz = {
    ui,
    drillDown,
    eventDrillDown
};
