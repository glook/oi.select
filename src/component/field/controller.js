/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import BaseController from '../baseController';

export default class controller extends BaseController {
    constructor($parse, $filter, $element, $scope) {
        super($parse, $filter, $element, $scope);
    }

    $onInit = () => {
        this.getInput().then((input) => {
            input.addEventListener('focus', () => this.changeFocused({value: true}));
        });
    };

    $onChanges = (currentValue) => {
        const {
            modelParams,
            selectOptions,
            editMode,
        } = currentValue;
        if (modelParams || selectOptions) {
            this.registerFilters();
        }
    };

    registerFilters = () => {
        const {
            modelParams: {
                itemLabel,
            },
            selectOptions: {
                searchFilter = '',
                listFilter = '',
                newItemFn,
                newItemModel,
            },
        } = this;

        const [searchFilterName, searchFilterOptions] = searchFilter.split(':');
        const [listFilterName, listFilterOptions] = listFilter.split(':');

        this.searchFilter = this._$filter(searchFilterName);
        this.searchFilterOptionsFn = this._$parse(searchFilterOptions);
        this.listFilter = this._$filter(listFilterName);
        this.listFilterOptionsFn = this._$parse(listFilterOptions);
        if (newItemFn || newItemModel) {
            if (newItemFn) {
                this.newItemFn = this._$parse(newItemFn);
            } else {
                const newItemModelFn = this._$parse(newItemModel);
                this.newItemFn = (scope, locals) => newItemModelFn(locals) || locals.query;
            }
        }
        this.itemLabelFn = this._$parse(itemLabel);
    };


    /**
     * Получаем label элмента для вывода в поисковой строке
     * @param item
     * @return {*}
     */
    getSearchLabel = (item) => {
        const {
            getItemLabel,
            element,
            searchFilter,
            searchFilterOptionsFn,
            query,
            oldQuery,
        } = this;
        const label = getItemLabel(item);
        return searchFilter(label, oldQuery || query, item, searchFilterOptionsFn(this), element);
    };

    __getValueWithCallback = (item, callbackFn) => this.getValue(this.modelParams.valueName, item, this, callbackFn);

    getItemLabel = item => this.__getValueWithCallback(item, this.itemLabelFn);

    getValue = (valueName, item, scope, getter) => {
        const locals = {};
        // 'name.subname' -> {name: {subname: item}} -> locals'
        valueName.split('.').reduce((previousValue, currentItem, index, arr) => {
            previousValue[currentItem] = index < arr.length - 1 ? {} : item;
        }, locals);
        return getter(scope, locals);
    };

    getInput = () => new Promise(resolve => setTimeout(() => resolve(this.element.querySelector('input')), 100));

    get queryInputWidth() {
        return this.query.length === 0
            ? '5px'
            : `${this.query.length * 13}px`;
    }

    get maxLength() {
        return this.readOnly
            ? 0
            : this.selectOptions.maxlength;
    }
}
