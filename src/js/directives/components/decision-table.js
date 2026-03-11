

angular.module('app').directive('decisionTable', function ($uibModal, APP, $document, $timeout) {

  return {
    restrict: 'E',
    scope: {
      table: '=model',
      variant: '=variant',
      mainForm: '=form',
      readonly: '='
    },
    transclude: true,
    templateUrl: 'templates/directives/decision-table.html',
    link: function ($scope, $element) {

      $scope.sortableOptions = {
        axis: 'y',
        handle: '> .table-decision-handler'
      };

      $scope.decisions = $scope.table.getDecisionVariants();

      $scope.onReorderFields = function (curIdx, nextIdx) {

        $scope.table.variants.forEach(function (item) {
          item.rules.forEach(function (rule) {
            rule.conditions[curIdx] = rule.conditions.splice(nextIdx, 1, rule.conditions[curIdx])[0];
          });
        })
      };
      // Fields

      $scope.revertField = function (field) {
        $uibModal.open({
          templateUrl: 'templates/modal/revert-field.html',
          controller: 'RevertFieldController',
          resolve: {
            field: field
          }
        });
      };

      $scope.editField = function (field) {
        if (field.isDeleted) return $scope.revertField(field);

        var modalInstance = $uibModal.open({
          templateUrl: 'templates/modal/add-field.html',
          controller: 'AddFieldController',

          resolve: {
            field: function () {
              return field;
            },
            table: function () {
              return $scope.table;
            }
          }
        });
        var oldFieldKey = field.key;
        modalInstance.result.then(function (newField) {
          $scope.table.findConditionsByFieldKey(oldFieldKey).forEach(function (item) {
            if (newField.typeChanged) item.reset();
            item.fieldKey = newField.key;
          });
        })
      };

      var editingCondition = [];
      var clickOutsideHandler = null;

      function unregisterClickOutside() {
        if (clickOutsideHandler) {
          $document.off('click', clickOutsideHandler);
          clickOutsideHandler = null;
        }
      }

      function registerClickOutside() {
        unregisterClickOutside();
        clickOutsideHandler = function (event) {
          var el = $element[0].querySelector('.decision-condition');
          if (!el || !el.contains(event.target)) {
            $scope.$apply(function () {
              editingCondition.slice().forEach($scope.cancelCondition);
            });
          }
        };
        $timeout(function () {
          $document.on('click', clickOutsideHandler);
        }, 0);
      }

      // Conditions
      $scope.saveCondition = function (field, condition) {
        if (!field.$valid) return;
        delete condition._editBackup;
        condition.isEditing = false;
        editingCondition = editingCondition.filter(function (c) { return c !== condition; });
        unregisterClickOutside();
      };
      $scope.cancelCondition = function (condition) {
        if (condition._editBackup) {
          condition.condition = condition._editBackup.condition;
          condition.value = condition._editBackup.value;
          delete condition._editBackup;
        }
        condition.isEditing = false;
        editingCondition = editingCondition.filter(function (c) { return c !== condition; });
        unregisterClickOutside();
      };
      $scope.editCondition = function (condition) {
        if (editingCondition.length > 0) {
          editingCondition.slice().forEach($scope.cancelCondition);
          return;
        }
        condition._editBackup = { condition: condition.condition, value: condition.value };
        condition.isEditing = true;
        editingCondition.push(condition);
        registerClickOutside();
      };

      $scope.$on('$destroy', unregisterClickOutside);
      // Rules

      $scope.validateRule = function (rule, form) {
        $scope.editRule(rule);
        $scope.saveRule(rule, form);
      };

      $scope.editRule = function (rule) {
        rule.isEditingTitle = true;
        rule.isEditingDecision = true;
      };
      $scope.saveRule = function (rule, form) {
        form.$setSubmitted(true);
        if (form.$invalid) return;
        rule.isEditingTitle = false;
        rule.isEditingDecision = false;
      };

      $scope.copyRule = function (rule, form) {
        $scope.variant.copyRule(rule);
      };

      $scope.deleteRule = function (rule) {
        rule.isDeleted = true;
      };
      $scope.revertRule = function (rule) {
        rule.isDeleted = false;
      };

      $scope.addNewRule = function () {
        $scope.editRule($scope.variant.createRule($scope.table.fields));
      };

      $scope.isWarningRule = function (rule) {
        var res = true;
        for (var i in rule.conditions) {
          if (rule.conditions[i].condition !== CONDITION_TYPES.IS_SET) {
            res = false;
            break;
          }
        }
        return res;
      };

    }
  }
});
