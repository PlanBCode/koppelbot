// https://www.chartjs.org/docs/latest/developers/updates.html
const Chart = require('chart.js');
const {renderUnit} = require('../../types/number/number');
const {sortTableOnClick, addSearchBox} = require('../list/list');
// TODO mixed
const CHART_TYPES = require('./chart.json').options.flavor.choices;

// TODO nth, avg, count_distinct, var(iance), stdev??
const AGGREGATORS = ['count', 'sum', 'join', 'first', 'last', 'min', 'max'];

function getBaseValue (aggregator) {
  switch (aggregator) {
    case 'count' : return 0;
    case 'join' : return ''; // TODO or concat?
    case 'sum' : return 0;
    default: return undefined;
  }
}

function getAggregationType (aggregator) {
  switch (aggregator) {
    case 'min' : return 'number';
    case 'max' : return 'number';
    case 'count' : return 'number';
    case 'sum' : return 'number';
    case 'join' : return 'string';
    default: return undefined;
  }
}

function aggregate (aggregator, aggregation, value, count) {
  switch (aggregator) {
    // TODO avg, count_distinct, var(iance), stdev??
    case 'sum' : return Number(aggregation) + Number(value);
    case 'join' : return aggregation + value; // TODO or concat, add seperator
    case 'first' : return count === 1 ? value : aggregation;
    case 'last' : return value;
    // TODO nth(x,1)
    case 'count' : return Number(aggregation) + 1;
    case 'max' : return typeof aggregation === 'undefined' ? value : Math.max(aggregation, value);
    case 'min' : return typeof aggregation === 'undefined' ? value : Math.min(aggregation, value);
    default: return undefined;
  }
}

exports.display = {
  waitingForInput: display => {
    const WRAPPER = display.getWRAPPER();
    if (WRAPPER.classList.contains('xyz-error')) return;
    const flavor = display.getOption('flavor') || 'bar';
    if (!CHART_TYPES.includes(flavor)) {
      WRAPPER.innerHTML = `Unknown chart flavor: '${flavor}'.`;
      WRAPPER.classList.add('xyz-error');
    } else WRAPPER.innerHTML = 'Waiting for input...';
  },
  waitingForData: display => {
    const WRAPPER = display.getWRAPPER();
    const aggregations = display.getOption('aggregations');
    const errors = [];
    for (const aggregation of aggregations) {
      const [aggregator, propertyName] = aggregation;
      if (!AGGREGATORS.includes(aggregator)) errors.push(`Unknown aggregator: '${aggregator}' for '${aggregator}(${propertyName})'.`);
      // TODO error if type are not numbers
    }

    if (errors.length) {
      WRAPPER.innerHTML = errors.join('<br/>');
      WRAPPER.classList.add('xyz-error');
    } else {
      WRAPPER.innerHTML = 'Waiting for data...';
      WRAPPER.classList.remove('xyz-error');
    }
  },
  empty: display => {
    const WRAPPER = display.getWRAPPER();
    if (WRAPPER.classList.contains('xyz-error')) return;
    WRAPPER.innerHTML = 'No items to display.';
  },
  first: display => {
    const WRAPPER = display.getWRAPPER();
    if (WRAPPER.classList.contains('xyz-error')) return;

    WRAPPER.innerHTML = '';
    WRAPPER.groups = {};
    const flavor = display.getOption('flavor') || 'bar';
    if (flavor === 'table') {
      const TABLE = document.createElement('TABLE');
      TABLE.className = 'xyz-list';
      if (display.getOption('showHeader') !== false) {
        const TR_header = document.createElement('TR');
        TR_header.className = 'xyz-list-header';
        if (display.getOption('multiSelect')) {
          const TD_checkbox = document.createElement('TD');
          TD_checkbox.className = 'xyz-list-icon';
          const INPUT_checkAll = document.createElement('INPUT');
          INPUT_checkAll.type = 'checkbox';
          if (display.isMultiSelected(undefined, '*')) INPUT_checkAll.checked = true;
          INPUT_checkAll.onclick = () => {
            if (INPUT_checkAll.checked) display.multiSelectAll();
            else display.multiSelectNone();
          };
          TD_checkbox.appendChild(INPUT_checkAll);

          TR_header.appendChild(TD_checkbox);

          display.onMultiSelect(selectEntityIds => {
            selectEntityIds = selectEntityIds ? selectEntityIds.split(',') : [];
            let all = true;
            let none = true;
            for (const TR of TABLE.childNodes) {
              const TD_checkbox = TR.firstChild;
              const INPUT_checkbox = TD_checkbox.firstChild;
              if (INPUT_checkbox && INPUT_checkbox.type === 'checkbox' && INPUT_checkbox !== INPUT_checkAll) {
                const entityId = display.hasOption('groupby') ? TR.groupId : TR.entityId;
                const checked = selectEntityIds.includes(entityId) || selectEntityIds.includes('*');
                INPUT_checkbox.checked = checked;
                if (checked) none = false;
                else all = false;
              }
            }
            INPUT_checkAll.checked = all;
            INPUT_checkAll.indeterminate = (!none && !all);
          });
        } // TODO if color and multi select
        if (display.hasOption('color')) {
          const TD_color = document.createElement('TD');
          TD_color.className = 'xyz-list-icon';
          TR_header.appendChild(TD_color);
        }
        if (display.hasOption('groupby')) {
          let groupByPropertyName = display.getOption('groupby');
          let groupByLabel = groupByPropertyName;
          const TD_groupBy = document.createElement('TD');
          if (groupByPropertyName.includes('=')) [groupByLabel, groupByPropertyName] = groupByPropertyName.split('='); // use defined label
          TD_groupBy.innerText = groupByLabel;
          TR_header.appendChild(TD_groupBy);
          const type = display.getNode(groupByPropertyName).getSetting('type');
          sortTableOnClick(TABLE, TD_groupBy, type);
        }
        if (display.hasOption('select')) {
          display.onSelect(selectEntityId => {
            for (const TR_entity of TABLE.childNodes) {
              const entityId = display.hasOption('groupby') ? TR_entity.groupId : TR_entity.entityId;
              if (entityId === selectEntityId) TR_entity.classList.add('xyz-list-selected');
              else TR_entity.classList.remove('xyz-list-selected');
            }
          });
        }

        const aggregations = display.getOption('aggregations');
        for (const aggregation of aggregations) {
          const [aggregator, propertyName] = aggregation;
          const label = aggregator + '(' + propertyName + ')';
          const TD_header = document.createElement('TD');
          const labels = display.getOption('labels');
          let title;
          if (labels && labels.hasOwnProperty(label)) title = display.getDisplayName(label);
          else {
            const displayLabel = aggregator + '(' + display.getDisplayName(propertyName) + ')';
            title = displayLabel;
          }
          const propertyNode = display.getNode(propertyName);
          if (propertyNode.hasSetting('unit')) {
            title += '&nbsp;(' + renderUnit(propertyNode.getSetting('unit')) + ')';
          }
          TD_header.innerHTML = title;
          let type = getAggregationType(aggregator);
          if (!type) type = display.getNode(propertyName).getSetting('type'); // fallback for untyped aggregations
          sortTableOnClick(TABLE, TD_header, type);
          TR_header.appendChild(TD_header);
        }
        TABLE.appendChild(TR_header);
        addSearchBox(display, TR_header, TABLE);
      }

      WRAPPER.appendChild(TABLE);
    } else {
      const CANVAS = document.createElement('CANVAS');

      WRAPPER.appendChild(CANVAS);
      WRAPPER.chart = new Chart(CANVAS, {
        type: flavor,
        data: {datasets: []},
        options: { // TODO parametrize
          legend: { // https://www.chartjs.org/docs/latest/configuration/legend.html
            display: display.getOption('showLegend') !== false,
            onClick: function (event, elem) {
              const entityId = WRAPPER.chart.data.datasets[0].entityIds[elem.index];
              if (display.hasOption('select')) display.select(undefined, entityId);
              if (display.hasOption('multiSelect')) display.multiSelectToggle(undefined, entityId);
            }
          }
          /* scales: { //TODO only if applicable (not for pie charts)
            yAxes: [{
              ticks: {
                beginAtZero: true
              }
            }]
          } */
        }
      });
      if (display.hasOption('select') || display.hasOption('multiSelect')) {
        CANVAS.onclick = function (evt) {
          // activePoints is an array of points on the canvas that are at the same position as the click event.
          const activePoints = WRAPPER.chart.getElementsAtEvent(evt);
          if (activePoints.length > 0) {
            const selectEntityId = WRAPPER.chart.data.datasets[0].entityIds[activePoints[0]._index];
            if (display.hasOption('select')) display.select(undefined, selectEntityId);
            if (display.hasOption('multiSelect')) display.multiSelectToggle(undefined, selectEntityId);
          }
        };
        display.onSelect(selectEntityId => {
          const borderColor = WRAPPER.chart.data.datasets[0].borderColor.map((borderColor, index) => {
            return selectEntityId === WRAPPER.chart.data.datasets[0].entityIds[index] ? 'yellow' : 'white';
          });
          WRAPPER.chart.data.datasets[0].borderColor = borderColor;
          WRAPPER.chart.update();
        });
      }
      WRAPPER.chart.update();
    }
  },
  entity: display => {
    const WRAPPER = display.getWRAPPER();
    if (WRAPPER.classList.contains('xyz-error')) return;
    const groups = WRAPPER.groups;

    const entityId = display.getEntityId();
    const entityClassName = display.getEntityClassName();

    const columns = display.getFlatNodes();

    const aggregations = display.getOption('aggregations');

    let groupId = '*';
    let groupByPropertyName = '*';
    if (display.hasOption('groupby')) {
      groupByPropertyName = display.getOption('groupby');
      if (groupByPropertyName.includes('=')) groupByPropertyName = groupByPropertyName.split('=')[1];
      groupId = display.getNode(groupByPropertyName).getContent();
    }

    if (!groups.hasOwnProperty(groupId)) {
      const group = {count: 0};
      groups[groupId] = group;
      for (const aggregation of aggregations) {
        const [aggregator, propertyName] = aggregation;
        const label = aggregator + '(' + propertyName + ')';
        const value = getBaseValue(aggregator);
        group[label] = value;
      }
    }
    const group = groups[groupId];
    ++group.count;

    for (const aggregation of aggregations) {
      const [aggregator, propertyName] = aggregation;
      const label = aggregator + '(' + propertyName + ')';
      const value = columns[propertyName].getContent();
      group[label] = aggregate(aggregator, group[label], value, group.count);
    }
    const flavor = display.getOption('flavor') || 'bar';
    if (flavor === 'table') {
      const TABLE = WRAPPER.firstChild;
      let offset = 0;
      if (display.hasOption('groupby')) offset++;
      if (display.hasOption('color')) offset++;
      if (display.hasOption('multiSelect')) offset++;

      for (const groupId in groups) {
        const group = groups[groupId];
        let found = false;
        for (const TR of TABLE.children) {
          if (TR.groupId === groupId) {
            for (let i = 0; i < aggregations.length; ++i) {
              const aggregation = aggregations[i];
              const TD = TR.children[i + offset];
              const [aggregator, propertyName] = aggregation;
              const label = aggregator + '(' + propertyName + ')';
              TD.innerText = group[label];
            }
            found = true;
          }
        }
        if (!found) { // create new row
          const TR = document.createElement('TR');
          TR.groupId = groupId;
          TR.entityId = entityId;
          if (display.hasOption('select')) {
            const selectEntityClassName = display.hasOption('groupby') ? undefined : entityClassName;
            const selectEntityId = display.hasOption('groupby') ? groupId : entityId;
            if (display.isSelected(selectEntityClassName, selectEntityId) || display.getOption('default') === selectEntityId) {
              TR.classList.add('xyz-list-selected');
            }
            TR.classList.add('xyz-list-selectable');
            TR.onclick = () => {
              display.select(selectEntityClassName, selectEntityId);
            };
          }
          if (display.hasOption('multiSelect')) {
            const selectEntityClassName = display.hasOption('groupby') ? undefined : entityClassName;
            const selectEntityId = display.hasOption('groupby') ? groupId : entityId;

            const TD = document.createElement('TD');
            TD.className = 'xyz-list-icon';
            const INPUT_checkbox = document.createElement('INPUT');
            INPUT_checkbox.setAttribute('type', 'checkbox');
            if (display.isMultiSelected(selectEntityClassName, selectEntityId)) INPUT_checkbox.checked = true;
            INPUT_checkbox.onclick = event => {
              if (INPUT_checkbox.checked) display.multiSelectAdd(selectEntityClassName, selectEntityId);
              else display.multiSelectRemove(selectEntityClassName, selectEntityId);
              event.stopPropagation();
            };
            TD.appendChild(INPUT_checkbox);
            TR.appendChild(TD);
          }
          if (display.hasOption('color')) {
            const TD = document.createElement('TD');
            TD.className = 'xyz-list-icon';
            const color = display.getColor();
            TD.innerHTML = `<svg width="20" height="20"><circle cx="10" cy="10" r="10" fill="${color}"/></svg>`;
            TR.appendChild(TD);
          }

          if (display.hasOption('groupby')) {
            const TD = document.createElement('TD');
            const groupByNode = display.getNode(groupByPropertyName);
            if (groupByNode) {
              const TAG = groupByNode.render('view', {display: 'title'});
              TD.appendChild(TAG);
            } else TD.innerText = groupId;
            TR.appendChild(TD);
          }

          const aggregations = display.getOption('aggregations');
          for (const aggregation of aggregations) {
            const [aggregator, propertyName] = aggregation;
            const label = aggregator + '(' + propertyName + ')';
            const TD = document.createElement('TD');
            TD.style.textAlign = 'right';
            TD.innerText = group[label];
            TR.appendChild(TD);
          }
          TABLE.appendChild(TR);
        }
      }
    } else {
      WRAPPER.chart.data.labels = Object.keys(groups);
      WRAPPER.chart.data.datasets = [];
      WRAPPER.tmpDatasets = [];
      for (const aggregation of aggregations) {
        const [aggregator, propertyName] = aggregation;
        const label = aggregator + '(' + propertyName + ')';
        const data = Object.keys(groups).map(groupId => groups[groupId][label]);
        const labels = entityClassName + ' ' + label + (groupByPropertyName === '*' ? '' : ' by ' + groupByPropertyName); // TODO parametrize
        const backgroundColor = Object.keys(groups).map(groupId => display.getColor(groupId));
        const borderColor = Object.keys(groups).map(groupId => display.hasOption('select') && display.isSelected(undefined, groupId) ? 'yellow' : 'white');
        const dataset = {
          entityIds: Object.keys(groups),
          data,
          label: labels,
          borderWidth: 1, // TODO parametrize
          backgroundColor,
          borderColor
          // TODO borderColors
        };
        WRAPPER.tmpDatasets.push(dataset);
      }
      if (!WRAPPER.updateTimeOutHandle) { // Throttle chart updates
        WRAPPER.updateTimeOutHandle = setTimeout(() => {
          WRAPPER.chart.data.datasets = WRAPPER.tmpDatasets;
          WRAPPER.chart.update();
          delete WRAPPER.updateTimeOutHandle;
        }, 500);
      }
    }
  },
  remove: display => {
    // TODO
  }
};
