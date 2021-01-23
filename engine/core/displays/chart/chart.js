const {pathFromUri} = require('../../../../factory/js/source/uri/uri.js'); //TODO better solution
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
        display.showCreateButton();
    },
    entity: display => {
        const WRAPPER = display.getWRAPPER();
        const groups = WRAPPER.groups;

        const entityId = display.getEntityId();
        const entityClassName = display.getEntityClassName();

        const columns = display.getFlatContent();

        const aggregations = display.getOption('aggregations');
        let groupId;
        if(display.hasOption('groupby')){
          const groupBy = display.getOption('groupby');
          // TODO check if groupBy exists in flatContent
          groupId = display.getFlatContent()[groupBy].getContent();
        } else groupId = '*';

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
        WRAPPER.innerHTML = JSON.stringify(groups,null,'  ');
    },
    remove: display => {
      //TODO
    }
};
