const {pathFromUri} = require('../../../../factory/js/source/uri/uri.js'); //TODO better solution

var Chart = require('chart.js');

/*
TODO
  chart display: table, pie, bar, line, etc (use library?)
  scatterPlot, stackedBar
*/
function getBaseValue(aggregator){
  switch(aggregator){
    case 'count' : return 0;
    case 'join' : return ''; //TODO or concat?
    case 'sum' : return 0;
    default: return undefined;
  }
}
function aggregate(aggregator, aggregation, value){

  switch(aggregator){
    //TODO count_distinct, var(iance), stdev??
    case 'sum' : return aggregation+value;
    case 'join' : return aggregation+value; // TODO or concat, add seperator
    case 'count' : return aggregation+1;
    case 'max' : return typeof aggregation === 'undefined' ? value : Math.max(aggregation,value);
    case 'min' : return typeof aggregation === 'undefined' ? value : Math.min(aggregation,value);
    default: return undefined;
  }

}

exports.display = {
    waitingForInput: display => {
        display.getWRAPPER().innerHTML = 'Waiting for input...';
    },
    waitingForData: display => {
        display.getWRAPPER().innerHTML = 'Waiting for data...';
    },
    empty: display => {
        display.getWRAPPER().innerHTML = 'No items to display.';
    },
    first: display => {
        const WRAPPER = display.getWRAPPER();
        WRAPPER.innerHTML = '';
        WRAPPER.groups = {};

        const CANVAS = document.createElement('CANVAS');

        WRAPPER.appendChild(CANVAS);
        WRAPPER.chart = new Chart(CANVAS, {
            type: 'bar',
            data: {
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                datasets: [{
                    label: '# of Votes',
                    data: [12, 19, 3, 5, 2, 3],
                    /*backgroundColor: [
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
                    ],*/
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });
    },
    entity: display => {
      //TODO https://www.chartjs.org/docs/latest/developers/updates.html
        const WRAPPER = display.getWRAPPER();
        const groups = WRAPPER.groups;

        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();

        const columns = display.getFlatContent();

        const aggregations = display.getOption('aggregations');
        let groupId = '*';;
        let groupBy = '*';
        if(display.hasOption('groupby')){
           groupBy = display.getOption('groupby');
          // TODO check if groupBy exists in flatContent
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
          group[label] = aggregate(aggregator, group[label], value);
        }

        WRAPPER.chart.data.labels = Object.keys(groups);
        WRAPPER.chart.data.datasets = [];
        for(let aggregation of aggregations){
          const [aggregator, propertyName] = aggregation;
          const label = aggregator+'('+propertyName+')';
          const dataset = {
            data: Object.keys(groups).map(groupId => groups[groupId][label]),
            label: entityClassName + ' ' +label + (groupBy ==='*'?'':' by '+groupBy)// TODO parametrize
            //TODO Colors
          }
          WRAPPER.chart.data.datasets.push(dataset);
        }
        WRAPPER.chart.update();


    },
    remove: display => {
      //TODO
    }
};
