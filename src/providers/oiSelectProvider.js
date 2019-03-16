/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import version from '../version';

export default () => ({
    options: {
        debounce: 500,
        searchFilter: 'oiSelectCloseIcon',
        dropdownFilter: 'oiSelectHighlight',
        listFilter: 'oiSelectAscSort',
        groupFilter: 'oiSelectGroup',
        editItem: false,
        newItem: false,
        closeList: true,
        saveTrigger: 'enter tab blur',
        minlength: 0
    },
    version: version(),
    $get: function () {
        return {
            options: this.options,
            version: this.version
        };
    }
});
