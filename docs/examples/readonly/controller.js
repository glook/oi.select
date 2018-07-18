angular.module('selectDemo')
    .controller('selectReadonlyController', function ($scope, ShopArrShort) {

        $scope.shopArrShort = ShopArrShort.query();

        $scope.bundle = ['T-shirt'];
        $scope.bundleExample2 = ['T-shirt'];
        $scope.readOnly = false;
        $scope.toggleReadOnly = function () {
            $scope.readOnly = !$scope.readOnly;
        }
    });
