'use strict';

var BETWEEN_FORMATS = {
  '$between':      { open: '[', close: ']' },
  '$between_excl': { open: ']', close: '[' },
  '$between_lexcl': { open: ']', close: ']' },
  '$between_rexcl': { open: '[', close: '[' }
};

angular.module('app').directive('fieldStatic', function (CONDITION_OPTIONS) {
  return {
    restrict: 'E',
    scope: {
      condition: '=',
      value: '='
    },
    templateUrl: 'templates/directives/field-static.html',
    link: function (scope) {
      scope.hasValue = function (condition) {
        return CONDITION_OPTIONS.hasNotValue.indexOf(condition) === -1;
      };
      scope.isBetween = function (condition) {
        return condition in BETWEEN_FORMATS;
      };
      scope.formatBetween = function (condition, value) {
        var fmt = BETWEEN_FORMATS[condition];
        if (!fmt || !value) return value;
        var parts = String(value).split(';');
        return fmt.open + parts[0] + ';' + parts[1] + fmt.close;
      };
    }
  };

});
