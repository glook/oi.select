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
        value: '<',
        options: '<',
        modelParams: '<',
        selectOptions: '<',
        query: '=',
        oldQuery: '<',
        element: '<',
        onRemove: '&',
        editMode: '<',
        showLoader: '<',
        multiple: '<',
        placeholder: '<',
        onChange: '&',
        onKeyDown: '&',
        onKeyUp: '&',
        backspaceFocus: '<',
    },
};
