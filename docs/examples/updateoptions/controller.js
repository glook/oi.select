angular.module('selectDemo')
    .controller('selectUpdateoptionsController', function ($scope, ShopArrShort) {
        $scope.shopArrShort = ShopArrShort.query();
        $scope.bundle = ['T-shirt'];
        $scope.oiSelectOptions = {
            editItem: false,
            debounce: 200
        };


        $scope.selectedOption = true;
        $scope.toggleOptions = function () {
            if ($scope.selectedOption) {
                $scope.oiSelectOptions = {
                    editItem: true,
                    newItem: 'prompt',
                    saveTrigger: 'enter blur tab',
                    maxlength: 200,
                    minlength: 3,
                };
                $scope.selectedOption = false;
            } else {
                $scope.oiSelectOptions = {
                    editItem: false,
                    debounce: 200
                };
                $scope.selectedOption = true;
            }
        }


    });
