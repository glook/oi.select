/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import {throttle as _throttle, debounce as _debounce} from 'throttle-debounce';
import mergeFn from 'deepmerge';
import {
    NG_OPTIONS_REGEXP,
    VALUES_REGEXP,
    SAVE_ON_TAB,
    SAVE_ON_SPACE,
    SAVE_ON_ENTER,
    SAVE_ON_BLUR,
} from '../constants';
import BaseController from './baseController';

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
export default class Controller extends BaseController {
    /* @ngInject */
    constructor($document, $q, $timeout, $parse, $interpolate, $injector, $filter, $animate, oiUtils, oiSelect, $element, $scope) {
        super($document, $q, $timeout, $parse, $interpolate, $injector, $filter, $animate, oiUtils, oiSelect, $element, $scope);
        this.multiple = false;
        this.placeholder = '';
        this.query = '';
        this.oldQuery = null;
        this.threshold = 30;
        this.throttle = 500;
        this.keyUpDownWerePressed = false;
        this.showLoader = false;
        this.isOpen = false;
        this.value = [];
        this.matchesWereReset = false;
        this.page = 0;
        this.focused = false;

        // Режим редактирования
        this.editMode = false;

        this.debouncedMatches = null;
        this.removedItem = null;
        const vm = this;
        this.groups = new Proxy({
            matches: {},
            collection: [],
            groupsLength: {},
        }, {
            set(target, key, value) {
                if (key === 'matches') {
                    if (Object.keys(value).length) {
                        target.groupsLength = vm.getItemsPosition(value);
                    } else {
                        target.groupsLength = {};
                    }
                }
                target[key] = value;
                if (!vm.isOpen) {
                    vm.isOpen = true;
                }
            },
            get(target, key) {
                return target[key];
            },
        });

        this.isEmptyList = true;
    }


    $onInit = () => {
        this.initEvents();
        this.registerFilters();
        this.registerOiOptionsAttributeElements();

        this.debouncedMatches = _debounce(this.options.debounce, (query = '', append = false, selectedAs = null) => this.fetchMatches(query, append, selectedAs));
    };

    /**
     * Обновляем значение
     */
    setValue = () => {
        const {
            ngModel,
            multiple,
        } = this;
        if (ngModel) {
            this.editMode = false;

            if (multiple) {
                this.value = [].concat(ngModel);
            } else {
                this.value = [ngModel];
            }
        } else {
            this.editMode = true;
        }
    };

    initEvents = () => {
        document.addEventListener('click', this.onClick);
        // Следим за моделью и обновляем в случае изменений
        this._$scope.$watch(() => this.ngModel, () => this.setValue());
    };

    $onChange = () => {
        console.log('change');
    };

    isValidOptionsRegexp = (input) => {
        try {
            return (typeof input === 'string' ? NG_OPTIONS_REGEXP.test(input) : false);
        } catch (e) {
            return false;
        }
    };

    /**
     * Получаем строку из аттрибута oi-options
     * и проверяем ее на валидацию
     * @return {boolean|string}
     */
    getOiOptionsAttributeExpression = () => {
        const {
            isValidOptionsRegexp,
            oiOptions,
        } = this;

        try {
            if (isValidOptionsRegexp(oiOptions)) {
                return oiOptions;
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    parseOiOptionsAttributeExpression = (expression) => {
        const match = expression ? expression.match(NG_OPTIONS_REGEXP) : ['', 'i', '', '', '', 'i', '', '', ''];
        if (!match) {
            throw new Error('Expected expression in form of \'_select_ (as _label_)? for (_key_,)?_value_ in _collection_\'');
        }
        return match;
    };

    get parsedOiOptionsAttributeExpression() {
        const {
            getOiOptionsAttributeExpression,
            parseOiOptionsAttributeExpression,
        } = this;
        const optionsExpression = getOiOptionsAttributeExpression();
        return parseOiOptionsAttributeExpression(optionsExpression);
    }

    /**
     * Разбираем данные из аттрибута oi-options
     * @return {({collectionParams}&{itemName: string, forKey: string, disableExpression: *, groupByExpression: *, itemLabel: string})|({collectionParams}&{trackByExpression: *, itemName: boolean, valueName, forKey, disableExpression: string, groupByExpression: string, itemLabel: *})}
     */
    get oiOptionsAttribute() {
        const {
            parsedOiOptionsAttributeExpression,
            parseCollectionExpression,
        } = this;

        const [
            fullExpression, // 0
            itemName, // 1
            itemLabel, // 2
            groupByExpression = '', // 3
            disableExpression = '', // 4
            valueName, // 5
            forKey, // 6
            forName, // 7
            colletionExpression, // 8
            trackByExpression, // 9
        ] = parsedOiOptionsAttributeExpression;

        const baseParams = {
            collectionParams: parseCollectionExpression(colletionExpression),
            keyTitle: forKey,
        };

        if (!forKey) {
            return {
                ...baseParams,
                itemName: / as /.test(fullExpression) && itemName,
                itemLabel: itemLabel || itemName,
                valueName,
                forKey,
                groupByExpression,
                disableExpression,
                trackByExpression: trackByExpression || (itemLabel || itemName),
                valueTitle: valueName,
            };
        }

        return {
            ...baseParams,
            itemName: `i.${forName}`,
            itemLabel: `i.${itemName}`,
            forKey: `i.${forKey}`,
            groupByExpression:
                groupByExpression
                    ? `i.${groupByExpression}`
                    : undefined,
            disableExpression:
                disableExpression
                    ? `i.${disableExpression}`
                    : undefined,
            trackByExpression: `i.${forKey}`,
            valueName: 'i',
            valueTitle: forName,
        };
    }

    registerOiOptionsAttributeElements = () => {
        const {
            oiOptionsAttribute: {
                itemName,
                itemLabel,
                groupByExpression,
                disableExpression,
                trackByExpression,
                collectionParams: {
                    fnName: collectionFnName,
                    valuesFnExpression,
                    filterFnExpression,
                },
            },
            _$parse,
        } = this;
        this.collectionFnName = collectionFnName;
        this.itemNameFn = itemName && _$parse(itemName);
        this.itemLabelFn = _$parse(itemLabel);
        this.groupByFn = _$parse(groupByExpression);
        this.disableFn = _$parse(disableExpression);
        this.filterFn = _$parse(filterFnExpression);
        this.valuesFn = _$parse(valuesFnExpression);
        this.trackByFn = _$parse(trackByExpression);
        this.allowPagination = !!valuesFnExpression.match(/\$page/);
    };

    /**
     * Парсим регуляркой выражение из параметра collection
     * @param collectionExpression
     * @return {{fnName: *, filterFnExpression: string, valuesFnExpression: string}}
     */
    parseCollectionExpression = (collectionExpression) => {
        const collection = collectionExpression.match(VALUES_REGEXP);
        const [,
            fnName,
            fnParams = '',
            fiterParams = '',
        ] = collection;
        return {
            fnName,
            filterFnExpression: `${fnName}${fiterParams}`,
            valuesFnExpression: `${fnName}${fnParams}`,
        };
    };

    registerFilters = () => {
        const {
            options: {
                searchFilter = '',
                dropdownFilter = '',
                listFilter = '',
                groupFilter = '',
            },
        } = this;

        const [searchFilterName, searchFilterOptions] = searchFilter.split(':');
        const [dropdownFilterName, dropdownFilterOptions] = dropdownFilter.split(':');
        const [listFilterName, listFilterOptions] = listFilter.split(':');
        const [groupFilterName, groupFilterOptions] = groupFilter.split(':');

        this.searchFilter = this._$filter(searchFilterName);
        this.searchFilterOptionsFn = this._$parse(searchFilterOptions);
        this.dropdownFilter = this._$filter(dropdownFilterName);
        this.dropdownFilterOptionsFn = this._$parse(dropdownFilterOptions);
        this.listFilter = this._$filter(listFilterName);
        this.listFilterOptionsFn = this._$parse(listFilterOptions);
        this.groupFilter = this._$filter(groupFilterName);
        this.groupFilterOptionsFn = this._$parse(groupFilterOptions);
    };

    /**
     * Получаем базовые опции + опции указанные в аттрибуте oiSelectOptions
     * @return {{cleanModel}}
     */
    get options() {
        const {oiSelectOptions} = this;
        const options = {
            cleanModel: oiSelectOptions.newItem === 'prompt',
            ...this._oiSelect.options,
            ...oiSelectOptions,
        };
        return {
            ...options,

        };
    }

    /**
     * Получаем текущий элемент
     * @return {*}
     */
    get element() {
        return this._$element[0];
    }

    /**
     * Получаем поле ввода
     * @return {Element | any}
     */
    get inputElement() {
        return this.element.querySelector('input.oi-select__input_element');
    }

    /**
     * Получаем выпадающий список
     * @return {Element | any}
     */
    get dropdownElement() {
        return this.element.querySelector('.oi-select__dropdown');
    }

    /**
     * Получаем родительский scope
     * @return {*}
     */
    get parentScope() {
        return this._$scope.$parent;
    }

    onChangeQuery = () => {
        const {
            options: {
                minlength,
            },
            query,
            oldQuery,
            matchesWereReset,
            multiple,
            getMatches,
        } = this;

        this.oldQuery = query;
        // console.log({oldQuery, query});

        if (query.length < minlength) return false;

        if (query !== oldQuery) {
            if (query) {
                console.log('debouncedMatches', query);
                this.debouncedMatches(query);
                this.oldQuery = null;
            } else if (multiple) {
                console.log('reset');
                this.matchesWereReset = true;
            }
        }
        this.matchesWereReset = true;

        // console.log('query is changed');
        return true;
    };

    onKeyDown = (event) => {
        const {
            key,
        } = event;
        const {
            groups: {
                collection,
            },
            saveOn,
        } = this;

        const [firstElementIndex, lastElementIndex] = [0, collection.length - 1];


        switch (key) {
            case 'ArrowUp': {
                const currentSelectorPosition = this.selectorPosition
                    ? this.selectorPosition
                    : firstElementIndex;

                const newSelectorPosition = currentSelectorPosition === firstElementIndex
                    ? firstElementIndex
                    : currentSelectorPosition - 1;

                this.setOption(newSelectorPosition);

                this.keyUpDownWerePressed = true;
                break;
            }
            case 'ArrowDown': {
                const currentSelectorPosition = this.selectorPosition
                    ? this.selectorPosition
                    : firstElementIndex;

                const newSelectorPosition = currentSelectorPosition === lastElementIndex
                    ? firstElementIndex
                    : currentSelectorPosition + 1;
                this.setOption(newSelectorPosition);
                this.keyUpDownWerePressed = true;

                if (!this.query.length && !this.isOpen) {
                    this.debouncedMatches();
                }

                if (!this.editMode) {
                    this.clearInputField();
                }
                break;
            }
            case 'Tab':
                saveOn(SAVE_ON_TAB);
                break;
            case ' ':
                saveOn(SAVE_ON_SPACE);
                break;
            case 'Enter':
                saveOn(SAVE_ON_ENTER);
                event.preventDefault();
                break;
            case 'Backspace':
                break;
            case 'Escape':

                if (!this.multiple) {
                    this.resetInput();

                    if (this.options.cleanModel) {
                        // @todo
                    }
                }
                this.resetMatches({cleanQuery: true});
                break;

            case 'ArrowLeft':
            case 'ArrowRight':
                break;
            default:
                console.log('default');
                if (!this.editMode) {
                    this.clearInputField();
                }
                this.resetMatches();
                return false;
        }
        return true;
    };

    onKeyUp = (event) => {
        const {
            key,
        } = event;
        switch (key) {
            case 'Backspace':
                break;
            default:
                return false;
        }
        return true;
    };


    __getValueWithCallback = (item, callbackFn) => this.getValue(this.oiOptionsAttribute.valueName, item, this, callbackFn);

    getItemName = item => this.__getValueWithCallback(item, this.itemNameFn);

    getItemLabel = item => this.__getValueWithCallback(item, this.itemLabelFn);

    getItemTrackBy = item => this.__getValueWithCallback(item, this.trackByFn);

    getItemDisabled = item => this.__getValueWithCallback(item, this.disableFn);

    getGroupName = item => this.__getValueWithCallback(item, this.groupByFn) || '';

    getFilter = list => this.__getValueWithCallback(list, this.filterFn);

    getDropdownLabel = (item) => {
        const {
            getItemLabel,
            element,
            dropdownFilter,
            dropdownFilterOptionsFn,
            oldQuery,
            query,
        } = this;
        const label = getItemLabel(item);
        return dropdownFilter(label, oldQuery || query, item, dropdownFilterOptionsFn(this), element);
    };

    getGroupLabel = (group, items) => {
        const {
            element,
            groupFilter,
            groupFilterOptionsFn,
            oldQuery,
            query,
        } = this;
        return groupFilter(group, oldQuery || query, items, groupFilterOptionsFn(this), element);
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
            oldQuery,
            query,
        } = this;
        const label = getItemLabel(item);
        return searchFilter(label, oldQuery || query, item, searchFilterOptionsFn(this), element);
    };

    getValue = (valueName, item, scope, getter) => {
        const locals = {};
        // 'name.subname' -> {name: {subname: item}} -> locals'
        valueName.split('.').reduce((previousValue, currentItem, index, arr) => {
            previousValue[currentItem] = index < arr.length - 1 ? {} : item;
        }, locals);
        return getter(scope, locals);
    };


    fetchMatches = (query = '', append = false, selectedAs = null) => {
        const {
            valuesFn,
            parentScope,
            setMatches,
        } = this;
        this.showLoader = true;
        this.isEmptyList = false;
        this.oldQuery = null;
        console.log('fetchMatches');
        return valuesFn(parentScope, {
            $query: query,
            $selectedAs: selectedAs,
            $page: this.page,
        }).then(values => setMatches(values, append).then((result) => {
            this.showLoader = false;
            this.$apply();
        }));
    };

    /**
     * Записываем полученные значения
     * @param values
     * @param appendItems
     * @return {Promise<any>}
     */
    setMatches = (values = [], appendItems = false) => {
        if (Array.isArray(values)) {
            if (!values.length) this.isEmptyList = true;
            // получаем сгруппированные элементы
            const groupedMatches = this.groupMatches(values);
            // Объединяем старые и новые элементы
            if (appendItems) {
                const [currCollection, currMatches] = [
                    this.groups.collection,
                    this.groups.matches,
                ];
                this.groups.matches = mergeFn(currMatches, groupedMatches);
                this.groups.collection = currCollection.concat(values);
            } else {
                // перезаписываем
                this.groups.matches = groupedMatches;
                this.groups.collection = values;
            }
            return new Promise(resolve => resolve(true));
        }
        return new Promise(resolve => resolve(false));
    };

    /**
     * Разделяем коллекцию на группы
     * @param values
     */
    groupMatches = (values = []) => {
        const result = {};
        values.forEach((el) => {
            const groupName = this.getGroupName(el);
            if (!Object.prototype.hasOwnProperty.call(result, groupName)) {
                result[groupName] = [el];
            } else {
                result[groupName] = result[groupName].concat([el]);
            }
        });
        return result;
    };

    onClick = (event) => {
        let targetElement = event.target; // clicked element
        do {
            if (targetElement === this.element) {
                return this.onFocus(event);
            }
            // Go up the DOM
            targetElement = targetElement.parentNode;
        } while (targetElement);

        return this.onBlur(event);
    };

    onBlur = (event) => {
        this.focused = false;
        if (this.isOpen) {
            this.isOpen = false;
            this.saveOn(SAVE_ON_BLUR);

            this.resetMatches({cleanQuery: true});
            this.resetInput();
            // if (!this.options.closeList) {
            //     this.isOpen = true;
            // } else {
            //     this.isOpen = false;
            // }
            this.$apply();
        }
    };

    onFocus = (event) => {
        const {
            target,
            target: {
                nodeName,
            },
        } = event;
        const {
            query,
            isOpen,
            options: {
                closeList,
                minlength,
            },
            fetchMatches,
        } = this;
        this.focused = true;
        console.log({target});
        if (query.length < minlength) return false;
        if (this._oiUtils.contains(this.element, event.target, 'disabled')) return false;

        if (!isOpen && nodeName !== 'INPUT') {
            this.editMode = true;
            setTimeout(() => this.inputElement.focus(), 10);
        }

        console.log({closeList});


        if (isOpen && closeList && (nodeName !== 'INPUT' || !query.length)) {
            // this.resetMatches();
            this.inputElement.focus();
            // console.log('res');
        } else {
            this.editMode = true;
            fetchMatches(query);
        }

        return true;
    };


    clearInputField = () => {
        this.editMode = true;
    };

    resetInput = () => {
        const modelExists = this.exists(this.ngModel);
        this.editMode = !this.exists(this.ngModel);
    };

    resetMatches = (options = {}) => {
        console.log('resetMatches');
        this.oldQuery = null;
        this.groups.matches = {};
        this.showLoader = false;
        this.isOpen = false;
        this.selectorPosition = null;
        this.page = 0;
        if (options.cleanQuery) {
            this.query = '';
        }
        this.$apply();
    };

    /**
     * Помечаем элемент как выбранный
     * @param itemIndex
     */
    setItemSelection = (itemIndex) => {
        this.selectorPosition = itemIndex;
        if (!this.keyUpDownWerePressed && this.selectorPosition !== itemIndex) {
            this.setOption(itemIndex);
        } else {
            this.keyUpDownWerePressed = false;
        }
    };

    /**
     * Добавляем выбранный элемент в value
     * @param option
     * @return {boolean}
     */
    addItem = (option) => {
        const {
            value,
            getItemTrackBy,
            multipleLimit,
            getGroupName,
            groups: {
                matches,
            },
            multiple,
            itemNameFn,
            resetInput,
        } = this;

        // Если этот элемент уже присутсвует в value, пропускаем
        if (multiple && this._oiUtils.intersection(value, [option], getItemTrackBy, getItemTrackBy).length) return false;

        // Если кол-во элементов больше чем указано в multipleLimit, пропускаем
        if (multipleLimit && value.length >= multipleLimit) {
            console.warn('limit');
            return false;
        }
        const optionGroupName = getGroupName(option);
        console.log({matches});

        const optionValue = itemNameFn ? this.getItemName(option) : option;
        console.log({optionValue});
        if (multiple) {
// @TODO Добавить
        } else {
            this.ngModel = optionValue;
            this.value = [optionValue];
            resetInput();
        }

        this.isOpen = false;
        this.inputElement.focus();
        return true;
    };

    /**
     * Обновляем размеры групп
     * @param values
     */
    getItemsPosition = (values) => {
        const groupsSize = {};
        let index = 0;
        Object.entries(values).forEach(([category, items]) => {
            groupsSize[category] = index;
            index += items.length;
        });
        return groupsSize;
    };

    /**
     * Сохраняем номер позиции и скроллим к ней, если список открыт
     * @param itemIndex
     */
    setOption = (itemIndex) => {
        const {
            dropdownElement,
        } = this;
        this.selectorPosition = itemIndex;
        if (this.isOpen) {
            this._oiUtils.scrollActiveOption(dropdownElement, dropdownElement.querySelectorAll('li')[itemIndex]);
        }
    };

    /**
     * Рефрешим view
     * @return {*}
     */
    $apply = () => this._$scope.$applyAsync();

    /**
     * Массив с триггерами для сохранения
     * @return {string[]}
     */
    get saveTriggers() {
        return this.options.saveTrigger.split(' ');
    }

    /**
     * Проверяем, указан ли triggerName как возможный для сохранения
     * @param triggerName
     * @return {boolean}
     */
    isAvailableSaveTrigger = triggerName => this.saveTriggers.includes(triggerName);

    saveOn = (triggerName) => {
        const {
            query,
            groups: {
                collection,
            },
            selectorPosition,
            isAvailableSaveTrigger,
            getItemDisabled,
            options: {
                newItem,
            },
            setOption,
        } = this;

        const item = collection[selectorPosition];
        const isNewItem = newItem && query;
        const isItemDisabled = item && getItemDisabled(item);

        console.log({

            item,
            isNewItem,
            isItemDisabled,

        });

        if (isAvailableSaveTrigger(triggerName) && (isNewItem || !isItemDisabled)) {
            console.log('try to save');
            this.selectorPosition = null;

            this.addItem(item);
        }
    };

    compact = (value = []) => {
        const {
            itemNameFn,
            getItemLabel,
        } = this;
        let compactValue = value;

        if (value && !Array.isArray(value)) {
            compactValue = [value];
        } else {
            compactValue = [];
        }

        return compactValue.filter(item => item && (Array.isArray(item) && item.length || itemNameFn || getItemLabel(item)));
    };

    exists = value => !!this.compact(value).length;

    /**
     * Получаем placeholder
     * @return {Controller.multiplePlaceholder|Controller.placeholder}
     */
    get placeholderValue() {
        const {
            placeholder,
            multiplePlaceholder,
            multiple,
        } = this;
        //@TODO Добавить логику если модель не пуста
        if (multiple) return multiplePlaceholder;

        return placeholder;
    }
}
