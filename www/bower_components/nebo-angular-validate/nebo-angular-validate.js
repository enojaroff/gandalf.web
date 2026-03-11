'use strict';

angular.module('nebo-angular-validate', []).provider('$validate', function ($injector) {

  var validators = {};

  return {
    add: function (name, fn) {
      validators[name] = fn;
    },
    $get: function () {

      var obj = {};
      obj.validator = function (type) {
        if (!validators[type]) {
          console.error('validator '+type+' not found');
          return null;
        }
        return validators[type];
      };
      obj.validate = function (type, value) {
        var validateObject = obj.validator(type);

        if (typeof validateObject == 'function') {
          return validateObject(value);
        }
        if (validateObject instanceof RegExp) {
          return validateObject.test((value || '').toString());
        }
        console.error('Unsupported type of validator object', validateObject);

        return false;
      };

      return obj;
    }
  }

}).directive('validate', ['$validate', function ($validate) {

  return {
    restrict: 'A',
    require: '?ngModel',
    link: function (scope, el, attrs, ngModel) {

      if (!ngModel) return;
      var types = [];

      attrs.$observe('validate', function (val) {
        init(val);
      });

      init(attrs['validate']);

      function addValidator(type) {
        var validatorFn = $validate.validator(type);

        if (validatorFn) {
          types.push(type);
          ngModel.$validators[type] = function (modelValue, viewValue) {
            return ngModel.$isEmpty(viewValue) || $validate.validate(type, modelValue);
          }
        }
      }

      function deleteValidator(type) {
        delete ngModel.$validators[type];
      }

      function init(str) {
        var newTypes = str.split(',');

        types = types.filter(function (item) {
          if (newTypes.indexOf(item) === -1) deleteValidator(item);
        });
        newTypes.forEach(function (item) {
          if (types.indexOf(item) !== -1) return;
          addValidator(item);
        })
      }
    }
  }
}]);
