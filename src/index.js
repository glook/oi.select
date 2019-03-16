/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import './scss/style.scss'

import oiSelectDirective from './directives';
import oiSelectServices from './services';
import oiSelectFilters from './filters';

angular.module('oi.select', [
    oiSelectFilters,
    oiSelectServices,
]).directive('oiSelect', oiSelectDirective);
