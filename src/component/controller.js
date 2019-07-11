/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import {debounce as _debounce} from 'throttle-debounce';
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

export default class Controller extends BaseController {
    /* @ngInject */
    constructor($q, $timeout, $parse, $injector, $filter, oiUtils, oiSelect, $element, $scope) {
        super($q, $timeout, $parse, $injector, $filter, oiUtils, oiSelect, $element, $scope);
        this._modelParams = null;
        this._selectOptions = null;
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
        this.matchesWereReset = false;
        // Режим редактирования
        this.editMode = false;
        this.ngDisable = false;
        this.editItemIsCorrected = false;
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
                        target.collection = [];
                    }
                }
                target[key] = value;

                if (!target.collection.length) {
                    vm.isOpen = false;
                } else if (!vm.isOpen && !vm.ngDisable) {
                    vm.isOpen = true;
                }
            },
            get(target, key) {
                return target[key];
            },
        });
        this.backspaceFocus = false;
        this.isEmptyList = true;
    }

    $onInit = () => {
        this.initEvents();
        this.registerFilters();
        this.registerOiOptionsAttributeElements();
        this.debouncedMatches = _debounce(this.selectOptions.debounce, (query = '', append = false, selectedAs = null) => this.fetchMatches(query, append, selectedAs));
        this.editItemIsCorrected = this.selectOptions.editItem === 'correct';
    };

    /**
     * Обновляем значение исходя из значения ngModel
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

    $onChanges = (currentValue) => {
        const {
            oiSelectOptions,
            oiOptions,
        } = currentValue;

        if (oiSelectOptions || oiOptions) {
            this._selectOptions = null;
            this._modelParams = null;

            this.initEvents();
            this.registerFilters();
            this.registerOiOptionsAttributeElements();
            this.debouncedMatches = _debounce(this.selectOptions.debounce, (query = '', append = false, selectedAs = null) => this.fetchMatches(query, append, selectedAs));
            this.editItemIsCorrected = this.selectOptions.editItem === 'correct';
        }
        console.log({currentValue});
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
            selectOptions: {
                listFilter = '',
                newItemFn,
                newItemModel,
                removeItemFn,
            },
            editItem,
        } = this;

        const [listFilterName, listFilterOptions] = listFilter.split(':');


        this.listFilter = this._$filter(listFilterName);
        this.listFilterOptionsFn = this._$parse(listFilterOptions);
        if (newItemFn || newItemModel) {
            if (newItemFn) {
                this.newItemFn = this._$parse(newItemFn);
            } else {
                /* eslint-disable-next-line */
                const newItemModelFn = this._$parse(newItemModel);
                this.newItemFn = (scope, locals) => newItemModelFn(locals) || locals.query;
            }
        }

        this.editItemFn = editItem
            ? this._$injector.get(editItem)
            : angular.noop;

        this.removeItemFn = this._$parse(removeItemFn);
    };


    get selectOptions() {
        if (!this._selectOptions) {
            const {
                oiSelectOptions = {},
                _oiSelect: {
                    options,
                },
            } = this;
            this._selectOptions = {
                cleanModel: oiSelectOptions.newItem === 'prompt',
                ...options,
                ...oiSelectOptions,
            };
        }
        return this._selectOptions;
    }

    get modelParams() {
        if (!this._modelParams) {
            this._modelParams = this.oiOptionsAttribute;
        }
        return this._modelParams;
    }

    cleanOiOptions = () => {
        this._modelParams = null;
        this._selectOptions = null;
    };


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

    onChangeQuery = () => setTimeout(() => {
        const {
            selectOptions: {
                minlength,
            },
            query,
            oldQuery,
            multiple,
            matchesWereReset,
            dropdownElement,
            readonly,
        } = this;
        if (readonly) {
            this.query = '';
            return false;
        }
        if (query.length < minlength) return false;

        if (query !== oldQuery && (!oldQuery || query) && !matchesWereReset) {
            dropdownElement.scrollTop = 0;
            if (query) {
                this.debouncedMatches(query);
                this.oldQuery = null;
            } else if (multiple) {
                this.matchesWereReset = true;
            }
        }
        this.matchesWereReset = false;

        return true;
    }, 30);

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
                /**
                 * @TODO исправить, изначально выбирается второй элемент
                 */
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
            case 'Backspace': {
                const {
                    query,
                    multiple,
                    editItem,
                    value,
                    removeItem,
                } = this;
                if (!query.length) {
                    if (!multiple || editItem) {
                        this.backspaceFocus = true;
                    }

                    if (this.backspaceFocus && value && (!multiple || value.length)) {
                        removeItem(value.length - 1);
                        if (editItem) {
                            event.preventDefault();
                        }
                    }
                }

                break;
            }
            case 'Escape': {
                const {
                    multiple,
                    resetInput,
                    selectOptions: {
                        cleanModel,
                    },
                    resetMatches,
                    removedItem,
                } = this;

                if (!multiple) {
                    resetInput();

                    if (cleanModel) {
                        this.ngModel = removedItem;
                    }
                }
                resetMatches({cleanQuery: true});
                break;
            }
            case 'ArrowLeft':
            case 'ArrowRight':
                break;
            default: {
                if (!this.editMode) {
                    this.clearInputField();
                }

                this.backspaceFocus = false;
                return false;
            }
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


    __getValueWithCallback = (item, callbackFn, scope = this) => this.getValue(this.modelParams.valueName, item, scope, callbackFn);

    getItemName = item => this.__getValueWithCallback(item, this.itemNameFn);

    getItemLabel = item => this.__getValueWithCallback(item, this.itemLabelFn);

    getItemTrackBy = item => this.__getValueWithCallback(item, this.trackByFn);

    getItemDisabled = item => this.__getValueWithCallback(item, this.disableFn);

    getGroupName = item => this.__getValueWithCallback(item, this.groupByFn) || '';

    getFilter = (list) => {
        const {
            collectionFnName,
            getValue,
            filterFn,
        } = this;
        return getValue(collectionFnName, list, this, filterFn);
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
        if (append) {
            this.page += 1;
        }
        this.showLoader = true;
        this.isEmptyList = false;
        this.oldQuery = null;
        this.$apply();


        const valuesRequest = valuesFn(parentScope, {
            $query: query,
            $selectedAs: selectedAs,
            $page: this.page,
        });


        return this._$q.when(valuesRequest.$promise || valuesRequest)
            .then(values => setMatches(values, append).then((result) => {
                this.showLoader = false;
                this.$apply();
                return result;
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
            const {
                groupMatches,
                filterMatches,
            } = this;

            const filteredMatches = filterMatches(values);

            if (!filteredMatches.length) this.isEmptyList = true;
            // получаем сгруппированные элементы
            const groupedMatches = groupMatches(filteredMatches);
            // Объединяем старые и новые элементы
            if (appendItems) {
                const [currCollection, currMatches] = [
                    this.groups.collection,
                    this.groups.matches,
                ];
                this.groups.matches = mergeFn(currMatches, groupedMatches);
                this.groups.collection = currCollection.concat(filteredMatches);
            } else {
                // перезаписываем
                this.groups.matches = groupedMatches;
                this.groups.collection = filteredMatches;
            }
            return new Promise(resolve => resolve(values.length));
        }
        return new Promise(resolve => resolve(0));
    };

    /**
     * Фильтруем результаты
     * @param values
     * @return {*}
     */
    filterMatches = (values) => {
        const {
            listFilterOptionsFn,
            listFilter,
            parentScope,
            element,
            value,
            query,
            getItemLabel,
            getItemTrackBy,
            getFilter,
            multiple,
        } = this;
        const data = multiple
            ? value
            : [];

        const filteredList = listFilter(values, query, getItemLabel, listFilterOptionsFn(parentScope), element);
        const withoutIntersection = this._oiUtils.intersection(filteredList, data, getItemTrackBy, getItemTrackBy, true);
        return getFilter(withoutIntersection);
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

        return this.onBlur();
    };

    onBlur = () => {
        if (this.focused) {
            const {
                selectOptions: {
                    keepQuery,
                },
                multiple,
            } = this;
            this.focused = false;
            if (!multiple) this.resetInput();
            if (!this.saveOn(SAVE_ON_BLUR)) {
                this.resetMatches({cleanQuery: !keepQuery});
            }
            this.editMode = false;
            this.page = 0;

            this.$apply();
        }
    };

    onFocus = (event) => {
        const {
            target: {
                nodeName,
            },
            target,
        } = event;
        const {
            query,
            isOpen,
            fetchMatches,
            element,
            multipleLimit,
            value,
            editItem,
            editItemIsCorrected,
        } = this;

        const {
            closeList,
            minlength,
        } = this.selectOptions;


        this.editMode = true;
        this.focused = true;
        // query length less then minlength
        if (query.length < minlength) return false;
        // option is disabled
        if (this._oiUtils.contains(element, target, 'disabled')) return false;

        // limit is reached
        if (value.length >= multipleLimit && this._oiUtils.contains(element, target, 'select-dropdown')) return false;

        if (isOpen && closeList && (nodeName !== 'INPUT' || !query.length)) {
        } else {
            fetchMatches(query);
        }

        this.element.querySelector('input').focus();

        this.$apply();
        return true;
    };

    clearInputField = () => {
        this.editMode = true;
    };

    resetInput = () => {
        this.editMode = !this.exists(this.ngModel);
    };

    setEditMode = (value) => {
        this.editMode = value;
        // if (value) {
        //     if (this.editItem && this.editItemIsCorrected) {
        //         console.log('cal;;');
        //         this.removedItem = this.query;
        //     }
        // }
    };

    resetMatches = (options = {}) => {
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
            multiple,
            itemNameFn,
            resetInput,
            selectOptions: {
                closeList,
            },
            groups: {
                matches,
            },
            query,
            oldQuery,
        } = this;
        this.oldQuery = query;
        // Если этот элемент уже присутсвует в value, пропускаем
        if (multiple && this._oiUtils.intersection(value, [option], getItemTrackBy, getItemTrackBy).length) return false;

        // Если кол-во элементов больше чем указано в multipleLimit, пропускаем
        if (multipleLimit && value.length >= multipleLimit) {
            this.blinkElement('oi-select_limited', 500);
            return false;
        }
        const optionGroupName = getGroupName(option);
        const optionGroup = matches[optionGroupName] || [];
        const optionValue = itemNameFn ? this.getItemName(option) : option;
        optionGroup.splice(optionGroup.indexOf(option), 1);

        if (multiple) {
            const {
                ngModel,
            } = this;
            this.ngModel = Array.isArray(ngModel)
                ? ngModel.concat([optionValue])
                : [optionValue];
            this.value = value.concat([optionValue]);
        } else {
            this.ngModel = optionValue;
            this.value = [optionValue];
            resetInput();
        }

        if (!multiple && !closeList) {
            this.resetMatches({cleanQuery: true});
        }
        this.valueChangedManually();
        this.oldQuery = oldQuery || query;
        this.query = '';
        this.backspaceFocus = false;
        this.$apply();
        return false;
    };

    removeItem = (index) => {
        const {
            value,
            multiple,
            ngModel,
            selectOptions: {
                cleanModel,
                closeList,
            },
            backspaceFocus,
            oldQuery,
            editItemFn,
            resetMatches,
            removeItemFn,
            editMode,
            ngDisabled,
        } = this;

        if (ngDisabled || (multiple && index < 0)) return false;

        this.removedItem = multiple ? ngModel[index] : ngModel;

        console.log('ss');

        return this._$q
            .when(removeItemFn(this.parentScope, {$item: this.removedItem}))
            .then(() => {
                if (!multiple && editMode) return false;

                if (this.multiple) {
                    const newValue = [
                        ...value.slice(0, index),
                        ...value.slice(index + 1),
                    ];
                    this.value = newValue;
                    this.ngModel = newValue;
                } else {
                    this.clearInputField();
                    if (cleanModel) {
                        this.ngModel = undefined;
                    }
                }

                if (multiple || !backspaceFocus) {
                    const {
                        removedItem,
                        getItemLabel,
                        editItemIsCorrected,
                        element,
                        readonly,
                    } = this;
                    if (readonly) {
                        this.query = '';
                    } else {
                        this.query = editItemFn(removedItem, oldQuery, getItemLabel, editItemIsCorrected, element) || '';
                    }
                }

                if (multiple && closeList) {
                    resetMatches();
                }

                this.$apply();
                return true;
            });
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
    /* eslint-disable-next-line */
    $apply = () => this._$scope.$applyAsync();

    /**
     * Массив с триггерами для сохранения
     * @return {string[]}
     */
    get saveTriggers() {
        return this.selectOptions.saveTrigger.split(' ');
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
            selectOptions: {
                newItem,
            },
            newItemFn,
        } = this;

        const item = collection[selectorPosition] || false;
        const isNewItem = newItem && query;
        const isItemDisabled = !!getItemDisabled(item);
        if (isAvailableSaveTrigger(triggerName) && (isNewItem || (item && !isItemDisabled))) {
            this.selectorPosition = null;
            if (!item && isNewItem && !selectorPosition) {
                if (newItemFn) {
                    const newItemValue = newItemFn(this.parentScope, {$query: query});
                    this.addItem(newItemValue);
                } else {
                    this.addItem(query);

                }

            } else {
                this.addItem(item);
            }
            this.resetMatches({cleanQuery: true});

            this.$apply();
            return true;
        }

        return false;
    };

    /**
     *
     * @param value
     * @return {*[]}
     */
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

        return compactValue.filter((item) => {
            const itemLength = Array.isArray(item) && item.length;
            return item && (itemLength || itemNameFn || getItemLabel(item));
        });
    };

    /**
     *
     * @param value
     * @return {boolean}
     */
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
        // @TODO Добавить логику если модель не пуста
        if (multiple) return placeholder;

        return placeholder;
    }


    valueChangedManually = () => {
        // case: clean model; prompt + editItem: 'correct'; initial value = defined/undefined
        this.editItemIsCorrected = false;
    };

    get editItem() {
        const {
            selectOptions: {
                editItem,
            },
        } = this;
        return editItem === true || editItem === 'correct'
            ? 'oiSelectEditItem'
            : editItem;
    }

    setFocused = (value) => {
        this.focused = value;
    };


    blinkElement(className, delay = 50) {
        this.element.classList.add(className);
        setTimeout(() => {
            this.element.classList.remove(className);
        }, delay);
    }
}
