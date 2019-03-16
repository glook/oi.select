import oiSelectProvider from './providers/oiSelectProvider.js';
import oiSelectEditItemFactory from './factories/oiSelectEditItemFactory';
import oiSelectEscapeFactory from './factories/oiSelectEscapeFactory';
import oiUtilsFactory from './factories/oiUtilsFactory';

export default angular.module('oi.select.services', [])
    .provider('oiSelect', oiSelectProvider)
    .factory('oiSelectEscape', oiSelectEscapeFactory)
    .factory('oiSelectEditItem', oiSelectEditItemFactory)
    .factory('oiUtils', oiUtilsFactory)
    .name;



