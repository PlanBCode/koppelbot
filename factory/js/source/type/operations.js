const types = require('../../build/types.js');

const comparisonOperators = { // align with engine/router/query.php
  '===': 'EQQ',
  '==': 'EQ',
  '!==': 'NEQQ',
  '!=': 'NEQ',
  '>=<': 'OVERLAP',
  '<>': 'IN',
  '><': 'OUT',
  '<=': 'LEQ',
  '>=': 'GEQ',
  '<': 'LT',
  '>': 'GT'
};

exports.operate = function operate (typeName, operator, lhs, rhs) {
  if (!types.hasOwnProperty(typeName)) {
    console.error(`Unknown type ${typeName}`);
    return false;
  }
  const type = types[typeName];
  if (!comparisonOperators.hasOwnProperty(operator)) {
    console.error(`Unknown operator ${operator}`);
    return false;
  }
  operator = comparisonOperators[operator];
  // use custom operators
  if (type.hasOwnProperty('operator' + operator)) return type['operator' + operator](lhs, rhs);
  else { // use default operators
    switch (operator) { // align with engine/core/types/type/type.php
      case 'EQQ' : return lhs == rhs; // non strict equal comparison is on purpose
      case 'EQ' : return typeof rhs === 'string'
        ? rhs === '*' || rhs.split(',').includes(String(lhs))
        : lhs == rhs; // non strict equal comparison is on purpose
      case 'NEQQ': return lhs != rhs; // non strict equal comparison is on purpose
      case 'NEQ': return typeof rhs === 'string'
        ? rhs !== '*' || !rhs.split(',').includes(String(lhs))
        : lhs != rhs; // non strict equal comparison is on purpose
      case 'OVERLAP': return false;
      case 'IN' : return false;
      case 'OUT' : return false;
      case 'LEQ' : return lhs <= rhs;
      case 'GEQ' : return lhs >= rhs;
      case 'LT' : return lhs < rhs;
      case 'GT' : return lhs > rhs;
    }
  }
};
