var URL = 'docs/';

angular.module('selectDemo', ['oi.select', 'ngResource', 'hljs', 'gettext' /*, 'ngTouch' */]) //bug https://github.com/angular/angular.js/issues/12734

    .factory('ShopArr', function ($resource) {
        return $resource(URL + 'data/shopArr.json', {}, {
                query: {method: 'GET', cache: true, isArray: true}
            }
        );
    })

    .factory('ShopArrShort', function ($resource) {
        return $resource(URL + 'data/shopArrShort.json', {}, {
                query: {method: 'GET', cache: true, isArray: true}
            }
        );
    })

    .factory('ShopObj', function ($resource) {
        return $resource(URL + 'data/shopObj.json', {}, {
                get: {method: 'GET', cache: true}
            }
        );
    })

    .factory('ShopObjShort', function ($resource) {
        return $resource(URL + 'data/shopObjShort.json', {}, {
                get: {method: 'GET', cache: true}
            }
        );
    })

    .controller('selectDocsController', function ($scope, $location) {
        var menu = [
            {urlName: 'autofocus', name: 'Autofocus'},
            {urlName: 'multiple', name: 'Multiple'},
            {urlName: 'single', name: 'Single'},
            {urlName: 'grouping', name: 'Grouping'},
            {urlName: 'filtered', name: 'Filtered'},
            {urlName: 'lazyloading', name: 'Lazy loading'},
            {urlName: 'disabled', name: 'Disabled'},
            {urlName: 'disabledoptions', name: 'Disabled options'},
            {urlName: 'cleanmodel', name: 'Clean model'},
            {urlName: 'multiplelimit', name: 'Multiple limit'},
            {urlName: 'createitems', name: 'Create items'},
            {urlName: 'autocomplete', name: 'Autocomplete'},
            {urlName: 'prompt', name: 'Prompt'},
            {urlName: 'selectas', name: 'Select as'},
            {urlName: 'editableoptions', name: 'Editable options'},
            {urlName: 'customization', name: 'Customization'},
            {urlName: 'validation', name: 'Validation'},
            {urlName: 'translate', name: 'Translate'},
            {urlName: 'readonly', name: 'Read only', isNew: true},
            {urlName: 'updateoptions', name: 'Updating options', isNew: true},
            {urlName: 'infiniteScroll', name: 'Infinite scroll', isNew: true},
            // {urlName: 'colors', name: 'Color customization', isNew: true},
            {urlName: 'keepQuery', name: 'Keep query', isNew: true},
            {urlName: 'all', name: 'All'}
        ];

        $scope.demo = {};
        $scope.demo.menu = menu;

        $scope.$on('$locationChangeSuccess', function () {
            var hash = $location.hash() || 'autofocus';

            $scope.demo.name = hash;
            $scope.demo.viewUrl = URL + 'examples/' + hash + '/template.html';
        });
    });
