'use strict';

var CONDITION_TYPES = {
  EQUAL: '$eq',
  GREATER_THEN: '$gt',
  GREATER_OR_EQUAL_THEN: '$gte',
  LOWER_THEN: '$lt',
  LOWER_OR_EQUAL_THEN: '$lte',
  NOT_EQUAL: '$ne',
  IN: '$in',
  NOT_IN: '$nin',
  CONTAINS: '$contains',
  IS_SET: '$is_set',
  IS_NULL: '$is_null',
  ANY: '$any',
  BETWEEN: '$between',
  BETWEEN_EXCL: '$between_excl',
  BETWEEN_LEXCL: '$between_lexcl',
  BETWEEN_REXCL: '$between_rexcl'
};

angular.module('conditions', []).value('CONDITION_SYMBOLS', {
  $eq: '=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $ne: '!=',

  $in: 'in',
  $nin: 'not in',

  $contains: 'contains',

  $is_set: 'is set',
  $is_null: 'is null',
  $any: 'any',

  $between: '[ between ]',
  $between_excl: '] between [',
  $between_lexcl: '] between ]',
  $between_rexcl: '[ between ['
}).constant('CONDITION_OPTIONS', {
  hasNotValue: [CONDITION_TYPES.IS_SET, CONDITION_TYPES.IS_NULL, CONDITION_TYPES.ANY]
}).constant('CONDITION_TYPES', CONDITION_TYPES).constant('CONDITIONS', {
  number: [
    CONDITION_TYPES.EQUAL,
    CONDITION_TYPES.GREATER_THEN,
    CONDITION_TYPES.GREATER_OR_EQUAL_THEN,
    CONDITION_TYPES.LOWER_THEN,
    CONDITION_TYPES.LOWER_OR_EQUAL_THEN,
    CONDITION_TYPES.NOT_EQUAL,
    CONDITION_TYPES.IN,
    CONDITION_TYPES.NOT_IN,
    CONDITION_TYPES.IS_SET,
    CONDITION_TYPES.IS_NULL,
    CONDITION_TYPES.ANY,
    CONDITION_TYPES.BETWEEN,
    CONDITION_TYPES.BETWEEN_EXCL,
    CONDITION_TYPES.BETWEEN_LEXCL,
    CONDITION_TYPES.BETWEEN_REXCL
  ],
  string: [
    CONDITION_TYPES.EQUAL,
    CONDITION_TYPES.NOT_EQUAL,
    CONDITION_TYPES.IN,
    CONDITION_TYPES.NOT_IN,
    //CONDITION_TYPES.CONTAINS,
    CONDITION_TYPES.IS_SET,
    CONDITION_TYPES.IS_NULL,
    CONDITION_TYPES.ANY
  ]
}).filter('condition', function (CONDITION_SYMBOLS) {
  return function (cond) {
    return CONDITION_SYMBOLS[cond];
  };
});
