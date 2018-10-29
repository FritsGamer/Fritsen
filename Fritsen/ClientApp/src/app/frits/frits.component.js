var classApp = angular.module('FritsComponent', []);

classApp.controller('fritsCtrl', function ($scope) {
  $scope.isActive = false;
  $scope.activeButton = function () {
    $scope.isActive = !$scope.isActive;
  }
});
