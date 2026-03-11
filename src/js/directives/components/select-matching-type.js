'use strict';

angular.module('app').directive('selectMatchingType', function () {
  return {
    restrict: 'E',
    template:
      '<div class="btn-group btn-group-matching">' +
        '<label class="btn btn-primary-matching" ng-model="topLevel" ng-change="onChangeTopLevel(topLevel)" uib-btn-radio="\'first\'">Decision</label>' +
        '<label class="btn btn-primary-matching" ng-model="topLevel" ng-change="onChangeTopLevel(topLevel)" uib-btn-radio="\'scoring\'">Scoring</label>' +
      '</div>',
    scope: {
      model: '=ngModel',
      callback: '&',
      strict: '='
    },
    link: function (scope) {
      scope.matchingType = scope.model;
    },
    controller: 'SelectMatchingTypeController'
  };
}).controller('SelectMatchingTypeController', function ($scope, $uibModal) {

  var modalInstance = null;
  var isScoring = function (type) { return type && type !== 'first'; };

  $scope.topLevel = isScoring($scope.model) ? 'scoring' : 'first';
  $scope.scoringSubType = isScoring($scope.model) ? $scope.model : 'scoring_sum';

  $scope.$watch('model', function (newVal) {
    if (isScoring(newVal)) {
      $scope.scoringSubType = newVal;
      $scope.topLevel = 'scoring';
    } else {
      $scope.topLevel = 'first';
    }
  });

  var triggerChange = function () {
    if (!$scope.strict) return $scope.confirm();
    modalInstance = $uibModal.open({
      templateUrl: 'templates/modal/change-matching-type.html',
      scope: $scope
    });
  };

  $scope.onChangeTopLevel = function (newTopLevel) {
    $scope.matchingType = newTopLevel === 'first' ? 'first' : $scope.scoringSubType;
    triggerChange();
  };

  $scope.cancel = function () {
    $scope.matchingType = $scope.model;
    $scope.topLevel = isScoring($scope.model) ? 'scoring' : 'first';
    if (modalInstance) modalInstance.close();
  };

  $scope.confirm = function () {
    if ($scope.callback()) {
      $scope.callback()($scope.matchingType);
    }
    $scope.model = $scope.matchingType;
    if (modalInstance) modalInstance.close();
  };

});
