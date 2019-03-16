/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import './scss/style.scss'

import oiSelectDirective from './directives';
import oiSelectServices from './services';
import oiSelectFilters from './filters';
import template from './template.html';

angular.module('oi.select', [
    oiSelectFilters,
    oiSelectServices,
])
    .directive('oiSelect', oiSelectDirective)
    .run(($templateCache) => {
        $templateCache.put('src/template.html', template);
    });
