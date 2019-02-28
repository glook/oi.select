angular.module('selectDemo')
    .controller('selectSingleController', function ($scope, ShopObj) {
        $scope.shopObj = ShopObj.get();
    });
