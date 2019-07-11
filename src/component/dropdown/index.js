/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import template from './template.html';
import controller from './controller';

export default {
    controllerAs: 'vm',
    template,
    controller,
    bindings: {
        onSelect: '&',
        onHover: '&',
        element: '<',
        groups: '<',
        query: '<',
        hoveredElement: '=',
        modelParams: '<',
        selectOptions: '<',
        loading: '<',
        fetchMatches: '&',
        page: '<',
        loadMore: '<',
    },
};
