/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import template from './template.html';
import controller from './controller';
import './style.scss';

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
        backspaceFocus: '<',
        changeEditMode: '&',
        changeFocused: '&',
        readOnly: '<',
    },
};
