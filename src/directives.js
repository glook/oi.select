angular.module('oi.select')

    .directive('oiSelect', ['$document', '$q', '$timeout', '$parse', '$interpolate', '$injector', '$filter', '$animate', 'oiUtils', 'oiSelect', function ($document, $q, $timeout, $parse, $interpolate, $injector, $filter, $animate, oiUtils, oiSelect) {
        var NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
        var VALUES_REGEXP = /([^\(\)\s\|\s]*)\s*(\(.*\))?\s*(\|?\s*.+)?/;

        return {
            restrict: 'AE',
            templateUrl: 'src/template.html',
            require: 'ngModel',
            scope: {},
            compile: function (element, attrs) {
                const parseOptions = (options) => {
                    const match = options ? options.match(NG_OPTIONS_REGEXP) : ['', 'i', '', '', '', 'i', '', '', ''];
                    if (!match) {
                        throw new Error("Expected expression in form of '_select_ (as _label_)? for (_key_,)?_value_ in _collection_'");
                    }
                    const result = {
                        match,
                    };
                    result.selectAsName = / as /.test(match[0]) && match[1];    //item.modelValue
                    result.displayName = match[2] || match[1];                 //item.label
                    result.valueName = match[5] || match[7];                 //item (value)
                    result.keyName = match[6];                             //(key)
                    result.groupByName = match[3] || '';                       //item.groupName
                    result.disableWhenName = match[4] || '';                       //item.disableWhenName
                    result.trackByName = match[9] || result.displayName;              //item.id
                    result.valueMatches = match[8].match(VALUES_REGEXP);        //collection
                    result.valueTitle = result.valueName;
                    result.keyTitle = result.keyName;

                    if (result.keyName) { //convert object data sources format to array data sources format
                        result.valueName = 'i';
                        result.selectAsName = `${result.valueName}.${(result.selectAsName || result.valueTitle)}`;
                        result.trackByName = `${result.valueName}.${result.keyName}`;
                        result.displayName = `${result.valueName}.${result.displayName}`;
                        result.keyName = `${result.valueName}.${result.keyName}`;
                        result.groupByName = result.groupByName ? `${result.valueName}.${result.groupByName}` : undefined;
                        result.disableWhenName = result.disableWhenName ? `${result.valueName}.${result.disableWhenName}` : undefined;
                    }

                    result.valuesName = result.valueMatches[1];                      //collection
                    result.filteredValuesName = result.valuesName + (result.valueMatches[3] || ''); //collection | filter
                    result.valuesFnName = result.valuesName + (result.valueMatches[2] || ''); //collection()

                    result.selectAsFn = result.selectAsName && $parse(result.selectAsName);
                    result.displayFn = $parse(result.displayName);
                    result.groupByFn = $parse(result.groupByName);
                    result.disableWhenFn = $parse(result.disableWhenName);
                    result.filteredValuesFn = $parse(result.filteredValuesName);
                    result.valuesFn = $parse(result.valuesFnName);
                    result.trackByFn = $parse(result.trackByName);

                    result.multiplePlaceholderFn = $interpolate(attrs.multiplePlaceholder || '');
                    result.listPlaceholderFn = $interpolate(attrs.listPlaceholder || '');
                    result.placeholderFn = $interpolate(attrs.placeholder || '');
                    result.optionsFn = $parse(attrs.oiSelectOptions);
                    result.isOldAngular = angular.version.major <= 1 && angular.version.minor <= 3;
                    return result;
                };

                /**
                 * Merge promise results
                 * @param baseObject
                 * @param mergeObject
                 * @return {*}
                 */
                const mergeGroups = (baseObject, mergeObject) => {
                    const baseObjectKeys = Object.keys(baseObject);
                    baseObjectKeys.forEach(baseKey => {
                        if (mergeObject[baseKey] !== undefined && Array.isArray(mergeObject[baseKey]))
                            baseObject[baseKey] = baseObject[baseKey].concat(mergeObject[baseKey]);
                    });
                    return baseObject;
                };

                const isPageVariableExists = () => oiSelectOptions.valuesFnName.match(/\$page/);


                let oiSelectOptions = {
                    placeholderFn: $interpolate(''),
                    listPlaceholderFn: $interpolate(''),
                    multiplePlaceholderFn: $interpolate(''),
                    optionsFn: () => {
                    },
                };
                const baseOptions = {
                    keyUpDownWerePressed: null,
                    matchesWereReset: null,
                    timeoutPromise: null,
                    lastQuery: null,
                    removedItem: null,
                    multiple: null,
                    multipleLimit: null,
                    newItemFn: null,
                    offsetTop: 0,
                    noMoreItems: false,
                    threshold: 30,
                    throttle: 500
                };

                return function (scope, element, attrs, ctrl) {
                    // Override the standard $isEmpty because an empty array means the input is empty.
                    ctrl.$isEmpty = function (value) {
                        return !exists(value)
                    };

                    var inputElement = element.find('input'),
                        listElement = angular.element(element[0].querySelector('.select-dropdown')),
                        placeholder = oiSelectOptions.placeholderFn(scope) || attrs.placeholder || '',
                        multiplePlaceholder = oiSelectOptions.multiplePlaceholderFn(scope) || attrs.multiplePlaceholder || '',
                        listPlaceholder = oiSelectOptions.listPlaceholderFn(scope),
                        elementOptions = oiSelectOptions.optionsFn(scope.$parent) || {},
                        options = angular.extend({cleanModel: elementOptions.newItem === 'prompt'}, oiSelect.options, elementOptions),
                        editItem = options.editItem,
                        editItemIsCorrected = editItem === 'correct',
                        waitTime = 0;

                    if (editItem === true || editItem === 'correct') {
                        editItem = 'oiSelectEditItem';
                    }
                    var editItemFn = editItem ? $injector.get(editItem) : angular.noop,
                        removeItemFn = $parse(options.removeItemFn);

                    oiSelectOptions.match = options.searchFilter.split(':');
                    var searchFilter = $filter(oiSelectOptions.match[0]),
                        searchFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                    oiSelectOptions.match = options.dropdownFilter.split(':');
                    var dropdownFilter = $filter(oiSelectOptions.match[0]),
                        dropdownFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                    oiSelectOptions.match = options.listFilter.split(':');
                    var listFilter = $filter(oiSelectOptions.match[0]),
                        listFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                    oiSelectOptions.match = options.groupFilter.split(':');
                    var groupFilter = $filter(oiSelectOptions.match[0]),
                        groupFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                    if (options.newItemFn) {
                        baseOptions.newItemFn = $parse(options.newItemFn);

                    } else {
                        baseOptions.newItemFn = function (scope, locals) {
                            return (oiSelectOptions.optionsFn(locals) || {}).newItemModel || locals.$query;
                        };
                    }

                    if (options.cleanModel && (!editItem || editItemIsCorrected)) {
                        element.addClass('cleanMode');
                    }

                    var unbindFocusBlur = oiUtils.bindFocusBlur(element, inputElement);

                    if (angular.isDefined(attrs.autofocus)) {
                        $timeout(function () {
                            inputElement[0].focus();
                        });
                    }

                    if (angular.isDefined(attrs.tabindex)) {
                        inputElement.attr('tabindex', attrs.tabindex);
                        element[0].removeAttribute('tabindex');
                    }

                    if (options.maxlength) {
                        inputElement.attr('maxlength', options.maxlength);
                    }

                    attrs.$observe('disabled', function (value) {
                        inputElement.prop('disabled', value);

                        //hide empty string with input
                        if (baseOptions.multiple && ctrl.$modelValue && ctrl.$modelValue.length) {
                            scope.inputHide = value;
                        }
                    });

                    scope.$on('$destroy', unbindFocusBlur);

                    scope.$parent.$watch(attrs.multipleLimit, function (value) {
                        baseOptions.multipleLimit = Number(value) || Infinity;
                    });

                    scope.$parent.$watch(attrs.multiple, function (multipleValue) {
                        baseOptions.multiple = multipleValue === undefined ? angular.isDefined(attrs.multiple) : multipleValue;

                        element[baseOptions.multiple ? 'addClass' : 'removeClass']('multiple');
                    });

                    function valueChangedManually() { //case: clean model; prompt + editItem: 'correct'; initial value = defined/undefined
                        if (editItemIsCorrected) {
                            element.removeClass('cleanMode');
                        }
                        editItemIsCorrected = false;
                    }

                    scope.$parent.$watch(attrs.ngModel, function (value, oldValue) {
                        var output = compact(value),
                            promise = $q.when(output);

                        modifyPlaceholder();

                        if (exists(oldValue) && value !== oldValue) {
                            valueChangedManually();
                        }

                        if (!baseOptions.multiple) {
                            restoreInput();
                        }

                        if (oiSelectOptions.selectAsFn && exists(value)) {
                            promise = getMatches(null, value)
                                .then(function (collection) {
                                    return oiUtils.intersection(output, collection, null, selectAs);
                                });
                            baseOptions.timeoutPromise = null; //`resetMatches` should not cancel the `promise`
                        }

                        if (baseOptions.multiple && attrs.disabled && !exists(value)) { //case: multiple, disabled=true + remove all items
                            scope.inputHide = false;
                        }

                        promise.then(function (collection) {
                            scope.output = collection;

                            if (collection.length !== output.length) {
                                scope.removeItem(collection.length); //if newItem was not created
                            }
                        });
                    });

                    scope.$watch('query', function (inputValue, oldValue) {
                        //terminated symbol
                        if (saveOn(inputValue.slice(0, -1), inputValue.slice(-1))) return;

                        //length less then minlength
                        if (String(inputValue).length < options.minlength) return;

                        //We don't get matches if nothing added into matches list
                        if (inputValue !== oldValue && (!scope.oldQuery || inputValue) && !baseOptions.matchesWereReset) {
                            listElement[0].scrollTop = 0;

                            if (inputValue) {
                                getMatches(inputValue);
                                scope.oldQuery = null;
                            } else if (baseOptions.multiple) {
                                resetMatches();
                                baseOptions.matchesWereReset = true;
                            }
                        }
                        baseOptions.matchesWereReset = false;
                    });

                    scope.$watch('groups', function (groups) {
                        if (oiUtils.groupsIsEmpty(groups)) {
                            scope.isOpen = false;

                        } else if (!scope.isOpen && !attrs.disabled) {
                            scope.isOpen = true;
                            scope.isFocused = true;
                        }
                    });

                    scope.$watch('isFocused', function (isFocused) {
                        $animate[isFocused ? 'addClass' : 'removeClass'](element, 'focused', !oiSelectOptions.isOldAngular && {
                            tempClasses: 'focused-animate'
                        });
                    });

                    if (angular.isDefined(attrs.threshold)) {
                        if (!isNaN(attrs.threshold))
                            baseOptions.threshold = parseInt(attrs.threshold);
                    }
                    if (angular.isDefined(attrs.throttle)) {
                        if (!isNaN(attrs.throttle))
                            baseOptions.throttle = parseInt(attrs.throttle);
                    }

                    const onScrollFn = function (e) {
                        var target = e.target;
                        baseOptions.offsetTop = target.scrollTop;
                        if (target.scrollTop + baseOptions.threshold + target.clientHeight >= target.scrollHeight) {
                            if (!baseOptions.noMoreItems) {
                                getMatches(scope.query, undefined, true);
                            }
                        }
                    };

                    const scrollToLastScrolledItem = (scrollPosition) => {
                        setTimeout(() => {
                            const optionsGroup = element[0].querySelector('.oi-select__dropdown');
                            optionsGroup.scrollTop = scrollPosition;
                        }, 30);
                    };

                    const throttledOnScrollListener = throttle(onScrollFn, baseOptions.throttle);
                    scope.$watch('isOpen', function (isOpen) {
                        $animate[isOpen ? 'addClass' : 'removeClass'](element, 'open', !oiSelectOptions.isOldAngular && {
                            tempClasses: 'open-animate'
                        });
                        if (isOpen) {
                            if (isPageVariableExists())
                                setTimeout(() => element[0].addEventListener('scroll', throttledOnScrollListener, true), 100);
                        }
                    });

                    scope.$watch('isEmptyList', function (isEmptyList) {
                        $animate[isEmptyList ? 'addClass' : 'removeClass'](element, 'emptyList', !oiSelectOptions.isOldAngular && {
                            tempClasses: 'emptyList-animate'
                        });
                    });

                    scope.$watch('showLoader', function (isLoading) {
                        $animate[isLoading ? 'addClass' : 'removeClass'](element, 'loading', !oiSelectOptions.isOldAngular && {
                            tempClasses: 'loading-animate'
                        });
                    });

                    if (angular.isDefined(attrs.readonly)) {
                        scope.$parent.$watch(attrs.readonly, function (value) {
                            if (value === undefined) {
                                value = true;
                            }
                            inputElement.attr('readonly', value);
                        });
                    }

                    if (angular.isDefined(attrs.oiOptions)) {
                        const match = attrs.oiOptions.match(NG_OPTIONS_REGEXP);
                        if (match) {
                            oiSelectOptions = parseOptions(attrs.oiOptions);
                        } else {
                            scope.$parent.$watch(attrs.oiOptions, function (value) {
                                oiSelectOptions = parseOptions(value);
                            });
                        }
                    }

                    scope.$parent.$watch(attrs.oiSelectOptions, function (value) {
                        options = angular.extend({cleanModel: elementOptions.newItem === 'prompt'}, oiSelect.options, value);
                        editItem = options.editItem;
                        editItemIsCorrected = editItem === 'correct';
                        waitTime = 0;

                        if (editItem === true || editItem === 'correct') {
                            editItem = 'oiSelectEditItem';
                        }

                        if (editItem === true || editItem === 'correct') {
                            editItem = 'oiSelectEditItem';
                        }
                        editItemFn = editItem ? $injector.get(editItem) : angular.noop;
                        removeItemFn = $parse(options.removeItemFn);

                        oiSelectOptions.match = options.searchFilter.split(':');
                        searchFilter = $filter(oiSelectOptions.match[0]);
                        searchFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                        oiSelectOptions.match = options.dropdownFilter.split(':');
                        dropdownFilter = $filter(oiSelectOptions.match[0]);
                        dropdownFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                        oiSelectOptions.match = options.listFilter.split(':');
                        listFilter = $filter(oiSelectOptions.match[0]);
                        listFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                        oiSelectOptions.match = options.groupFilter.split(':');
                        groupFilter = $filter(oiSelectOptions.match[0]);
                        groupFilterOptionsFn = $parse(oiSelectOptions.match[1]);

                        if (options.newItemFn) {
                            baseOptions.newItemFn = $parse(options.newItemFn);
                        } else {
                            baseOptions.newItemFn = function (scope, locals) {
                                return (oiSelectOptions.optionsFn(locals) || {}).newItemModel || locals.$query;
                            };
                        }
                    }, true);
                    //

                    scope.addItem = function addItem(option) {
                        baseOptions.lastQuery = scope.query;

                        //duplicate
                        if (baseOptions.multiple && oiUtils.intersection(scope.output, [option], trackBy, trackBy).length) return;
                        //limit is reached
                        if (scope.output.length >= baseOptions.multipleLimit) {
                            blinkClass('limited');
                            return;
                        }

                        var optionGroup = scope.groups[getGroupName(option)] = scope.groups[getGroupName(option)] || [];
                        var modelOption = oiSelectOptions.selectAsFn ? selectAs(option) : option;

                        optionGroup.splice(optionGroup.indexOf(option), 1);

                        if (baseOptions.multiple) {
                            ctrl.$setViewValue(angular.isArray(ctrl.$modelValue) ? ctrl.$modelValue.concat(modelOption) : [modelOption]);

                        } else {
                            ctrl.$setViewValue(modelOption);
                            restoreInput();
                        }

                        if (oiUtils.groupsIsEmpty(scope.groups)) {
                            scope.groups = {}; //it is necessary for groups watcher
                        }

                        if (!baseOptions.multiple && !options.closeList) {
                            resetMatches({query: true});
                        }

                        valueChangedManually();

                        scope.oldQuery = scope.oldQuery || scope.query;
                        scope.query = '';
                        scope.backspaceFocus = false;
                    };

                    scope.removeItem = function removeItem(position) {
                        if (attrs.disabled || baseOptions.multiple && position < 0) return;

                        baseOptions.removedItem = baseOptions.multiple ? ctrl.$modelValue[position] : ctrl.$modelValue;

                        $q.when(removeItemFn(scope.$parent, {$item: baseOptions.removedItem}))
                            .then(function () {
                                if (!baseOptions.multiple && !scope.inputHide) return;

                                if (baseOptions.multiple) {
                                    ctrl.$modelValue.splice(position, 1);
                                    ctrl.$setViewValue([].concat(ctrl.$modelValue));

                                } else {
                                    cleanInput();

                                    if (options.cleanModel) {
                                        ctrl.$setViewValue(undefined);
                                    }
                                }

                                if (baseOptions.multiple || !scope.backspaceFocus) {
                                    scope.query = editItemFn(baseOptions.removedItem, baseOptions.lastQuery, getLabel, editItemIsCorrected, element) || '';
                                }

                                if (baseOptions.multiple && options.closeList) {
                                    resetMatches({query: true});
                                }
                            })
                    };

                    scope.setSelection = function (index) {
                        if (!baseOptions.keyUpDownWerePressed && scope.selectorPosition !== index) {
                            setOption(listElement, index);
                        } else {
                            baseOptions.keyUpDownWerePressed = false;
                        }
                    };

                    scope.keyUp = function keyUp(event) { //scope.query is actual
                        switch (event.keyCode) {
                            case 8: /* backspace */
                                if (!scope.query.length && (!baseOptions.multiple || !scope.output.length)) {
                                    resetMatches();
                                }
                        }
                    };

                    scope.keyDown = function keyDown(event) {
                        var top = 0,
                            bottom = scope.order.length - 1;

                        switch (event.keyCode) {
                            case 38: /* up */
                                scope.selectorPosition = angular.isNumber(scope.selectorPosition) ? scope.selectorPosition : top;
                                setOption(listElement, scope.selectorPosition === top ? bottom : scope.selectorPosition - 1);
                                baseOptions.keyUpDownWerePressed = true;
                                break;

                            case 40: /* down */
                                scope.selectorPosition = angular.isNumber(scope.selectorPosition) ? scope.selectorPosition : top - 1;
                                setOption(listElement, scope.selectorPosition === bottom ? top : scope.selectorPosition + 1);
                                baseOptions.keyUpDownWerePressed = true;
                                if (!scope.query.length && !scope.isOpen) {
                                    getMatches();
                                }
                                if (scope.inputHide) {
                                    cleanInput();
                                }

                                break;

                            case 37: /* left */
                            case 39: /* right */
                                break;

                            case 9: /* tab */
                                saveOn('tab');
                                break;

                            case 13: /* enter */
                                saveOn('enter');
                                event.preventDefault(); // Prevent the event from bubbling up as it might otherwise cause a form submission
                                break;

                            case 32: /* space */
                                saveOn('space');
                                break;

                            case 27: /* esc */
                                if (!baseOptions.multiple) {
                                    restoreInput();

                                    if (options.cleanModel) {
                                        ctrl.$setViewValue(baseOptions.removedItem);
                                    }
                                }
                                resetMatches();
                                break;

                            case 8: /* backspace */
                                if (!scope.query.length) {
                                    if (!baseOptions.multiple || editItem) {
                                        scope.backspaceFocus = true;
                                    }
                                    if (scope.backspaceFocus && scope.output && (!baseOptions.multiple || scope.output.length)) { //prevent restoring last deleted option
                                        scope.removeItem(scope.output.length - 1);

                                        if (editItem) {
                                            event.preventDefault();
                                        }
                                        break;
                                    }
                                    scope.backspaceFocus = !scope.backspaceFocus;
                                    break;
                                }
                            default: /* any key */
                                if (scope.inputHide) {
                                    cleanInput();
                                }
                                scope.backspaceFocus = false;
                                return false; //preventDefaults
                        }
                    };

                    scope.getSearchLabel = function (item) {
                        var label = getLabel(item);

                        return searchFilter(label, scope.oldQuery || scope.query, item, searchFilterOptionsFn(scope.$parent), element);
                    };

                    scope.getDropdownLabel = function (item) {
                        var label = getLabel(item);

                        return dropdownFilter(label, scope.oldQuery || scope.query, item, dropdownFilterOptionsFn(scope.$parent), element);
                    };

                    scope.getGroupLabel = function (group, items) {
                        return groupFilter(group, scope.oldQuery || scope.query, items, groupFilterOptionsFn(scope.$parent), element);
                    };

                    scope.getDisableWhen = getDisableWhen;


                    resetMatches();
                    element[0].addEventListener('click', click, true); //triggered before add or delete item event
                    scope.$on('$destroy', function () {
                        element[0].removeEventListener('click', click, true);
                    });
                    element.on('focus', focus);
                    element.on('blur', blur);

                    function blinkClass(name, delay) {
                        delay = delay || 150;

                        element.addClass(name);

                        $timeout(function () {
                            element.removeClass(name);
                        }, delay);
                    }

                    function cleanInput() {
                        scope.listItemHide = true;
                        scope.inputHide = false;
                    }

                    function restoreInput() {
                        var modelExists = exists(ctrl.$modelValue);
                        scope.listItemHide = !modelExists;
                        scope.inputHide = modelExists;
                    }

                    function click(event) {
                        //query length less then minlength
                        if (scope.query.length < options.minlength) return;

                        //option is disabled
                        if (oiUtils.contains(element[0], event.target, 'disabled')) return;

                        //limit is reached
                        if (scope.output.length >= baseOptions.multipleLimit && oiUtils.contains(element[0], event.target, 'select-dropdown')) return;

                        if (scope.inputHide) {
                            scope.removeItem(0); //because click on border (not on chosen item) doesn't remove chosen element
                        }

                        if (scope.isOpen && options.closeList && (event.target.nodeName !== 'INPUT' || !scope.query.length)) { //do not reset if you are editing the query
                            resetMatches({query: options.editItem && !editItemIsCorrected});
                            scope.$evalAsync();
                        } else {
                            getMatches(scope.query);
                        }
                    }

                    function focus(event) {
                        if (scope.isFocused) return;

                        scope.isFocused = true;

                        if (attrs.disabled) return;

                        scope.backspaceFocus = false;
                    }


                    function blur(event) {
                        scope.isFocused = false;

                        if (!baseOptions.multiple) {
                            restoreInput();
                        }

                        if (!saveOn('blur')) {
                            resetMatches();
                        }
                        scope.$evalAsync();
                    }

                    function saveOn(query, triggerName) {
                        if (!triggerName) {
                            triggerName = query;
                            query = scope.query;
                        }

                        var isTriggered = options.saveTrigger.split(' ').indexOf(triggerName) + 1,
                            isNewItem = options.newItem && query,
                            selectedOrder = triggerName !== 'blur' ? scope.order[scope.selectorPosition] : null, //do not save selected element in dropdown list on blur
                            itemPromise;

                        if (isTriggered && (isNewItem || selectedOrder && !getDisableWhen(selectedOrder))) {
                            scope.showLoader = true;
                            itemPromise = $q.when(selectedOrder || oiSelectOptions.newItemFn(scope.$parent, {$query: query}));

                            itemPromise
                                .then(function (data) {
                                    if (data === undefined) {
                                        return $q.reject();
                                    }

                                    scope.addItem(data);

                                    var bottom = scope.order.length - 1;

                                    if (scope.selectorPosition === bottom) {
                                        setOption(listElement, 0); //TODO optimise when list will be closed
                                    }
                                    options.newItemFn && !selectedOrder || $timeout(angular.noop); //TODO $applyAsync work since Angular 1.3
                                    resetMatches();
                                })
                                .catch(function () {
                                    blinkClass('invalid-item');
                                    scope.showLoader = false;
                                });

                            return true;
                        }
                    }

                    function modifyPlaceholder() {
                        var currentPlaceholder = baseOptions.multiple && exists(ctrl.$modelValue) ? multiplePlaceholder : placeholder;
                        inputElement.attr('placeholder', currentPlaceholder);
                    }

                    function trackBy(item) {
                        return oiUtils.getValue(oiSelectOptions.valueName, item, scope.$parent, oiSelectOptions.trackByFn);
                    }

                    function selectAs(item) {
                        return oiUtils.getValue(oiSelectOptions.valueName, item, scope.$parent, oiSelectOptions.selectAsFn);
                    }

                    function getLabel(item) {
                        return oiUtils.getValue(oiSelectOptions.valueName, item, scope.$parent, oiSelectOptions.displayFn);
                    }

                    function getDisableWhen(item) {
                        return scope.isEmptyList || oiUtils.getValue(oiSelectOptions.valueName, item, scope.$parent, oiSelectOptions.disableWhenFn);
                    }

                    function getGroupName(option) {
                        return oiUtils.getValue(oiSelectOptions.valueName, option, scope.$parent, oiSelectOptions.groupByFn) || '';
                    }

                    function filter(list) {
                        return oiUtils.getValue(oiSelectOptions.valuesName, list, scope.$parent, oiSelectOptions.filteredValuesFn);
                    }

                    function compact(value) {
                        value = value instanceof Array ? value : value ? [value] : [];

                        return value.filter(function (item) {
                            return item !== undefined && (item instanceof Array && item.length || oiSelectOptions.selectAsFn || getLabel(item));
                        });
                    }

                    function exists(value) {
                        return !!compact(value).length;
                    }

                    function getMatches(query, selectedAs, append = false) {
                        if (append) {
                            scope.page++;
                        } else {
                            scope.page = 0;
                        }
                        scope.isEmptyList = false;
                        if (baseOptions.timeoutPromise && waitTime) {
                            $timeout.cancel(baseOptions.timeoutPromise); //cancel previous timeout
                        }

                        baseOptions.timeoutPromise = $timeout(function () {
                            var values = oiSelectOptions.valuesFn(scope.$parent, {
                                $query: query,
                                $page: scope.page,
                                $selectedAs: selectedAs
                            }) || '';

                            scope.selectorPosition = options.newItem === 'prompt' ? false : 0;

                            if (!query && !selectedAs) {
                                scope.oldQuery = null;
                            }

                            if (values.$promise && !values.$resolved || angular.isFunction(values.then)) {
                                waitTime = options.debounce;
                            }

                            scope.showLoader = true;

                            return $q.when(values.$promise || values)
                                .then(function (values) {
                                    if (!append) {
                                        scope.groups = {};
                                        baseOptions.noMoreItems = false;
                                    } else {
                                        // stop it when no more values found
                                        if (!values.length)
                                            baseOptions.noMoreItems = true;
                                    }

                                    if (values && oiSelectOptions.keyName) {
                                        //convert object data sources format to array data sources format
                                        var arr = [];

                                        angular.forEach(values, function (value, key) {
                                            if (key.toString().charAt(0) !== '$') {
                                                var item = {};

                                                item[oiSelectOptions.keyTitle] = key;
                                                item[oiSelectOptions.valueTitle] = value;
                                                arr.push(item);
                                            }
                                        });

                                        values = arr;
                                    }

                                    if (values && !selectedAs) {
                                        var outputValues = baseOptions.multiple ? scope.output : [];
                                        var filteredList = listFilter(values, query, getLabel, listFilterOptionsFn(scope.$parent), element);
                                        var withoutIntersection = oiUtils.intersection(filteredList, outputValues, trackBy, trackBy, true);
                                        var filteredOutput = filter(withoutIntersection);

                                        //add element with placeholder to empty list
                                        if (!filteredOutput.length) {
                                            scope.isEmptyList = true;

                                            if (listPlaceholder) {
                                                var context = {};

                                                oiSelectOptions.displayFn.assign(context, listPlaceholder);
                                                filteredOutput = [context[oiSelectOptions.valueName]]
                                            }
                                        }
                                        if (append) {
                                            scope.groups = mergeGroups(scope.groups, group(filteredOutput));
                                            scrollToLastScrolledItem(baseOptions.offsetTop);
                                        } else {
                                            scope.groups = group(filteredOutput);
                                        }
                                    }
                                    updateGroupPos();

                                    return values;
                                })
                                .finally(function () {
                                    scope.showLoader = false;
                                    if (options.closeList && !options.cleanModel) { //case: prompt
                                        $timeout(function () {
                                            setOption(listElement, 0);
                                        });
                                    }
                                });
                        }, waitTime);

                        return baseOptions.timeoutPromise;
                    }

                    function updateGroupPos() {
                        var i, key, value, collectionKeys = [], groupCount = 0;

                        scope.order = [];
                        scope.groupPos = {};

                        for (key in scope.groups) {
                            if (scope.groups.hasOwnProperty(key) && key.charAt(0) !== '$') {
                                collectionKeys.push(key);
                            }
                        }

                        if (oiSelectOptions.isOldAngular) {
                            collectionKeys.sort(); //TODO: Think of a way which does not depend on the order in which Angular displays objects by ngRepeat
                        }

                        for (i = 0; i < collectionKeys.length; i++) {
                            key = collectionKeys[i];
                            value = scope.groups[key];

                            scope.order = scope.order.concat(value);
                            scope.groupPos[key] = groupCount;
                            groupCount += value.length
                        }
                    }

                    function resetMatches(options) {
                        options = options || {};

                        scope.oldQuery = null;
                        scope.backspaceFocus = false; // clears focus on any chosen item for del
                        scope.groups = {};
                        scope.order = [];
                        scope.showLoader = false;
                        scope.isOpen = false;
                        waitTime = 0;

                        if (!options.query) {
                            scope.query = '';
                        }

                        if (baseOptions.timeoutPromise) {
                            $timeout.cancel(baseOptions.timeoutPromise);//cancel previous timeout
                        }
                    }

                    function setOption(listElement, position) {
                        scope.selectorPosition = position;
                        oiUtils.scrollActiveOption(listElement[0], listElement.find('li')[position]);
                    }

                    function group(input) {
                        var optionGroups = {'': []},
                            optionGroupName,
                            optionGroup;

                        for (var i = 0; i < input.length; i++) {
                            optionGroupName = getGroupName(input[i]);

                            if (!(optionGroup = optionGroups[optionGroupName])) {
                                optionGroup = optionGroups[optionGroupName] = [];
                            }
                            optionGroup.push(input[i]);
                        }

                        return optionGroups;
                    }
                }
            }
        }
    }
    ]);
