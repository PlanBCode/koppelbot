function apiRequest (method, uri, data, dataCallback, errorCallback) {

  const xhr = new XMLHttpRequest();
  xhr.open(method,  window.location.href+'api' + uri, true);

  xhr.onreadystatechange = e => {
    if (xhr.readyState === 4) {
      //      if (xhr.status >= 200 && xhr.status <= 299) {
//      console.log(xhr.responseText)
      dataCallback(xhr.responseText)
    }
  };
  xhr.send(data);
}
function updateTable(TABLE,data){
  TABLE.innerHTML='';
    for(let entityClass in data){
      for(let entityId in data[entityClass]){
        const entity = data[entityClass][entityId]
        const TR = document.createElement('TR');
        for(let propertyName in entity){
          const TD= document.createElement('TD');
          TD.innerHTML = entity[propertyName];
          TR.appendChild(TD);
        }
        TABLE.appendChild(TR);
      }
    }

}
function table(uri){
  const SCRIPT = document.currentScript;
  apiRequest('GET',uri,undefined, content => {
    const data = JSON.parse(content);
    const TABLE = document.createElement('TABLE');
    updateTable(TABLE,data);
    setInterval(()=>{
      apiRequest('GET',uri,undefined, content => {
        const data = JSON.parse(content);
        updateTable(TABLE,data);
      });
    },1000);

    SCRIPT.parentNode.appendChild(TABLE)
    SCRIPT.parentNode.removeChild(SCRIPT)
  })
}

function edit(uri){
const SCRIPT = document.currentScript;
  apiRequest('GET',uri,undefined, content => {
    const data = JSON.parse(content);
    const TABLE = document.createElement('TABLE');
    for(let entityClass in data){
      for(let entityId in data[entityClass]){
        const entity = data[entityClass][entityId]
        const TR = document.createElement('TR');
        for(let propertyName in entity){
          const TD= document.createElement('TD');
          const LABEL = document.createElement('SPAN');
          LABEL.innerHTML=propertyName;
          const INPUT = document.createElement('INPUT');
          INPUT.value = entity[propertyName];
          INPUT.oninput = e=>{
            apiRequest('PUT',uri, INPUT.value,()=>{},()=>{});
          }
          TD.appendChild(LABEL);
          TD.appendChild(INPUT);
          TR.appendChild(TD);
        }
        TABLE.appendChild(TR);
      }
    }
    SCRIPT.parentNode.insertBefore(TABLE,SCRIPT)
    SCRIPT.parentNode.removeChild(SCRIPT)
  })
}


const xyz = {
  table,
  edit
}
