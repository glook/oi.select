/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import BaseController from '../baseController';

export default class controller extends BaseController {
    constructor($parse, $filter, $element) {
        super($parse, $filter, $element);
        this.lastRequestCount = -1;
    }

    $onChanges = (currentValue) => {
        const {
            modelParams,
            selectOptions,
            page,
        } = currentValue;

        if (modelParams || selectOptions) {
            this.registerFilters();
        }
        if (page && page.currentValue === 0) {
            this.lastRequestCount = this.groups.collection.length - 1;
        }
    };

    $onInit = () => {
        this._$element[0].querySelector('.oi-select__dropdown').addEventListener('scroll', this.onScroll);
    };

    registerFilters = () => {
        const {
            selectOptions: {
                dropdownFilter = '',
                groupFilter = '',
            },
            modelParams: {
                disableExpression,
                itemLabel,
            },
        } = this;

        const [dropdownFilterName, dropdownFilterOptions] = dropdownFilter.split(':');
        const [groupFilterName, groupFilterOptions] = groupFilter.split(':');

        this.dropdownFilter = this._$filter(dropdownFilterName);
        this.dropdownFilterOptionsFn = this._$parse(dropdownFilterOptions);
        this.groupFilter = this._$filter(groupFilterName);
        this.groupFilterOptionsFn = this._$parse(groupFilterOptions);
        this.disableFn = this._$parse(disableExpression);
        this.itemLabelFn = this._$parse(itemLabel);
    };

    __getValueWithCallback = (item, callbackFn) => this.getValue(this.modelParams.valueName, item, this, callbackFn);

    getItemDisabled = item => this.__getValueWithCallback(item, this.disableFn);

    getDropdownLabel = (item) => {
        const {
            getItemLabel,
            element,
            dropdownFilter,
            dropdownFilterOptionsFn,
            query,
        } = this;
        const label = getItemLabel(item);
        return dropdownFilter(label, query, item, dropdownFilterOptionsFn(this), element);
    };

    getItemLabel = item => this.__getValueWithCallback(item, this.itemLabelFn);

    getGroupLabel = (group, items) => {
        const {
            element,
            groupFilter,
            groupFilterOptionsFn,
            query,
        } = this;
        return groupFilter(group, query, items, groupFilterOptionsFn(this), element);
    };

    getValue = (valueName, item, scope, getter) => {
        const locals = {};
        // 'name.subname' -> {name: {subname: item}} -> locals'
        valueName.split('.').reduce((previousValue, currentItem, index, arr) => {
            previousValue[currentItem] = index < arr.length - 1 ? {} : item;
        }, locals);
        return getter(scope, locals);
    };

    onScroll = (event) => {
        const {
            target: {
                scrollTop,
                clientHeight,
                scrollHeight,
            },
        } = event;
        const {
            query,
            loadMore,
        } = this;
        if (loadMore) {
            const threshold = 30;
            if ((scrollTop + threshold + clientHeight) >= scrollHeight) {
                if (this.lastRequestCount !== 0) {
                    this.fetchMatches({query, append: true}).then((itemsCount) => {
                        this.lastRequestCount = itemsCount;
                    });
                }
            }
        }
    };
}
