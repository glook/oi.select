/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import template from './template.html';
import controller from './controller';

export default {
    controllerAs: 'vm',
    template,
    controller,
    scope: true,
    bindings: {
        ngModel: '=',
        ngDisable: '<?',
        oiOptions: '<',
        oiSelectOptions: '<?',
        keepQuery: '<?',
        throttle: '<?',
        threshold: '<?',
        placeholder: '@?',
        readonly: '<?',
        multiple: '<?',
        multipleLimit: '@?',
        multiplePlaceholder: '@?',
        autofocus: '<?',
    },
};
