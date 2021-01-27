const {pathFromUri} = require('../../../../factory/js/source/uri/uri.js'); //TODO better solution

// https://www.chartjs.org/docs/latest/developers/updates.html
const Chart = require('chart.js');

//TODO table,
//TODO mixed
const CHART_TYPES = ['table','line','bar','rader','doughnut','pie','polarArea','bubble','scatter'];
// TODO nth, avg, count_distinct, var(iance), stdev??
const AGGREGATORS = ['count','sum','join','first','last','min','max']


const COLOR ={ //TODO parametrize
  backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  'rgba(255, 206, 86, 0.2)',
                  'rgba(75, 192, 192, 0.2)',
                  'rgba(153, 102, 255, 0.2)',
                  'rgba(255, 159, 64, 0.2)'
              ],
              borderColor: [
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)',
                  'rgba(75, 192, 192, 1)',
                  'rgba(153, 102, 255, 1)',
                  'rgba(255, 159, 64, 1)'
              ],
              borderWidth: 1
}
function getBaseValue(aggregator){
  switch(aggregator){
    case 'count' : return 0;
    case 'join' : return ''; //TODO or concat?
    case 'sum' : return 0;
    default: return undefined;
  }
}
function aggregate(aggregator, aggregation, value, count){
  switch(aggregator){
    //TODO avg, count_distinct, var(iance), stdev??
    case 'sum' : return aggregation+value;
    case 'join' : return aggregation+value; // TODO or concat, add seperator
    case 'first' : return count === 1 ? value : aggregation;
    case 'last' : return value;
    // TODO nth(x,1)
    case 'count' : return aggregation+1;
    case 'max' : return typeof aggregation === 'undefined' ? value : Math.max(aggregation,value);
    case 'min' : return typeof aggregation === 'undefined' ? value : Math.min(aggregation,value);
    default: return undefined;
  }
}

exports.display = {
    waitingForInput: display => {
      const WRAPPER = display.getWRAPPER();
      if(WRAPPER.classList.contains('xyz-error')) return;
      const flavor = display.getOption('flavor')|| 'bar';
      if(!CHART_TYPES.includes(flavor)){
        WRAPPER.innerHTML = `Unknown chart flavor: '${flavor}'.`;
        WRAPPER.classList.add('xyz-error');
      } else WRAPPER.innerHTML = 'Waiting for input...';
    },
    waitingForData: display => {
      const WRAPPER = display.getWRAPPER();
      const aggregations = display.getOption('aggregations');
      const errors = [];
      for(let aggregation of aggregations){
        const [aggregator, propertyName] = aggregation;
        if(!AGGREGATORS.includes(aggregator)) errors.push(`Unknown aggregator: '${aggregator}'.`)
        //TODO error if type are not numbers
      }
      if(display.hasOption('groupby')){
        const groupBy = display.getOption('groupby');
        // TODO check if groupBy exists in flatContent
      }

      if(errors.length){
        WRAPPER.innerHTML = errors.join('<br/>');
        WRAPPER.classList.add('xyz-error');
      }else{
        WRAPPER.innerHTML = 'Waiting for data...';
        WRAPPER.classList.remove('xyz-error');
      }
    },
    empty: display => {
      const WRAPPER = display.getWRAPPER();
      if(WRAPPER.classList.contains('xyz-error')) return;
      WRAPPER.innerHTML = 'No items to display.';
    },
    first: display => {
        const WRAPPER = display.getWRAPPER();
        if(WRAPPER.classList.contains('xyz-error')) return;

        WRAPPER.innerHTML = '';
        WRAPPER.groups = {};
        const flavor = display.getOption('flavor')|| 'bar';
        if(flavor === 'table'){
          const TABLE = document.createElement('TABLE');
          TABLE.className = 'xyz-list';
          const TR = document.createElement('TR');
          TR.className = 'xyz-list-header';
          if(display.hasOption('color')){
            const TD = document.createElement('TD');
            TR.appendChild(TD);
          }
          if(display.hasOption('groupby')){
            const groupBy = display.getOption('groupby');
            const TD = document.createElement('TD');
            TD.innerText = groupBy;
            TR.appendChild(TD);
          }


          const aggregations = display.getOption('aggregations');
          for(let aggregation of aggregations){
            const [aggregator, propertyName] = aggregation;
            const label = aggregator+'('+propertyName+')';
            const TD = document.createElement('TD');
            TD.innerText = label;
            TR.appendChild(TD);
          }
          TABLE.appendChild(TR);

          WRAPPER.appendChild(TABLE);


        }else{
          const CANVAS = document.createElement('CANVAS');
          WRAPPER.appendChild(CANVAS);
          WRAPPER.chart = new Chart(CANVAS, {
              type: flavor,
              data: {},
              options: { //TODO parametrize
                  scales: {
                      yAxes: [{
                          ticks: {
                              beginAtZero: true
                          }
                      }]
                  }
              }
          });
        }
    },
    entity: display => {
        const WRAPPER = display.getWRAPPER();
        if(WRAPPER.classList.contains('xyz-error')) return;
        const groups = WRAPPER.groups;

        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();

        const columns = display.getFlatContent();

        const aggregations = display.getOption('aggregations');
        let groupId = '*';;
        let groupBy = '*';
        if(display.hasOption('groupby')){
          groupBy = display.getOption('groupby');
          groupId = display.getFlatContent()[groupBy].getContent();
        }

        if(!groups.hasOwnProperty(groupId)){
          const group = {count:0};
          groups[groupId] = group;
          for(let aggregation of aggregations){
            const [aggregator, propertyName] = aggregation;
            const label = aggregator+'('+propertyName+')';
            const value = getBaseValue(aggregator);
            group[label] = value;
          }
        }
        const group = groups[groupId];
        ++group.count;

        for(let aggregation of aggregations){
          const [aggregator, propertyName] = aggregation;
          const label = aggregator+'('+propertyName+')';
          const value = columns[propertyName].getContent();
          group[label] = aggregate(aggregator, group[label], value, group.count);
        }
        const flavor = display.getOption('flavor')|| 'bar';
        if(flavor === 'table'){
          const TABLE = WRAPPER.firstChild;
          const offset = display.hasOption('color') ? 2 : 1;
          for(let groupId in groups){
            const group = groups[groupId];
            let found = false;
            for(let TR of TABLE.children){
              if(TR.groupId  === groupId){
                for(let i = 0; i< aggregations.length;++i){
                  const aggregation = aggregations[i];
                  const TD = TR.children[i+offset];
                  const [aggregator, propertyName] = aggregation;
                  const label = aggregator+'('+propertyName+')';
                  TD.innerText = group[label];
                }
                found = true;
              }
            }
            if(!found){ // create new row
              const TR = document.createElement('TR');
              TR.groupId = groupId;

              if( display.hasOption('color')){
                const TD = document.createElement('TD');
                const color = display.getColor();
                TD.innerHTML = `<svg width="20" height="20"><circle cx="10" cy="10" r="10" fill="${color}"/></svg>`
                TR.appendChild(TD);
              }

              if(display.hasOption('groupby')){
                const TD = document.createElement('TD');
                TD.innerText = groupId;
                TR.appendChild(TD);
              }

              const aggregations = display.getOption('aggregations');
              for(let aggregation of aggregations){
                const [aggregator, propertyName] = aggregation;
                const label = aggregator+'('+propertyName+')';
                const TD = document.createElement('TD');
                TD.innerText = group[label];
                TR.appendChild(TD);
              }
              TABLE.appendChild(TR);
            }
          }
            //TODO
        }else{
          WRAPPER.chart.data.labels = Object.keys(groups);
          WRAPPER.chart.data.datasets = [];
          for(let aggregation of aggregations){
            const [aggregator, propertyName] = aggregation;
            const label = aggregator+'('+propertyName+')';
            const data = Object.keys(groups).map(groupId => groups[groupId][label]);
            const labels = entityClassName + ' ' +label + (groupBy ==='*'?'':' by '+groupBy); // TODO parametrize
            const backgroundColor = Object.keys(groups).map(groupId => display.getColor(groupId));
            const dataset = {
              data,
              label:labels,
                borderWidth: 1, // TODO parametrize
                backgroundColor
              //TODO borderColors
            }
            WRAPPER.chart.data.datasets.push(dataset);
          }
          WRAPPER.chart.update();
        }

    },
    remove: display => {
      //TODO
    }
};