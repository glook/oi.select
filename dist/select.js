'use strict';

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
function throttleFn (fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last, deferTimer;
  return function () {
    var context = scope || this;
    var now = +new Date(),
        args = arguments;

    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

var oiSelectDirective = /* @ngInject */
["$document", "$q", "$timeout", "$parse", "$interpolate", "$injector", "$filter", "$animate", "oiUtils", "oiSelect", function ($document, $q, $timeout, $parse, $interpolate, $injector, $filter, $animate, oiUtils, oiSelect) {
  return {
    restrict: 'AE',
    templateUrl: 'src/template.html',
    require: 'ngModel',
    scope: {
      oiOptions: '@'
    },
    compile: function compile(element, attrs) {
      return function (scope, element, attrs, ctrl) {
        var NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
        var VALUES_REGEXP = /([^\(\)\s\|\s]*)\s*(\(.*\))?\s*(\|?\s*.+)?/;
        var watchers = {};
        var clickEvent = false;

        if (angular.isDefined(attrs.oiOptions)) {
          var match = attrs.oiOptions.match(NG_OPTIONS_REGEXP);

          if (match) {
            onBeforeRender();
          } else {
            scope.$parent.$watch(attrs.oiOptions, function () {
              return onBeforeRender();
            }, true);
          }
        }

        if (angular.isDefined(attrs.oiSelectOptions)) {
          scope.$parent.$watch(attrs.oiSelectOptions, function () {
            return onBeforeRender();
          }, true);
        }

        function onBeforeRender() {
          scope.rendered = false;
          Object.keys(watchers).map(function (key) {
            if (typeof watchers[key] === 'function') {
              watchers[key]();
              delete watchers[key];
            }
          });
          setTimeout(function () {
            return render();
          }, 100);
        }

        scope.focus = function () {
          return false;
        };

        scope.blur = function () {
          return false;
        };

        element.on('focus', function () {
          return scope.focus();
        }).on('blur', function () {
          return scope.blur();
        });
        var inputElement = element.find('input');
        var unbindFocusBlur = oiUtils.bindFocusBlur(element, inputElement);
        scope.$on('$destroy', unbindFocusBlur);

        function render() {
          var oiOptions = scope.oiOptions;

          try {
            var checkOptionRegexp = function checkOptionRegexp(input) {
              return typeof input === 'string' ? NG_OPTIONS_REGEXP.test(input) : false;
            };

            if (!checkOptionRegexp(oiOptions)) oiOptions = scope.$parent.$eval(scope.oiOptions);
          } catch (e) {
            scope.rendered = false;
          }

          var optionsExp = typeof oiOptions === 'string' ? oiOptions : false,
              match = optionsExp ? optionsExp.match(NG_OPTIONS_REGEXP) : ['', 'i', '', '', '', 'i', '', '', ''];

          if (!match) {
            throw new Error("Expected expression in form of '_select_ (as _label_)? for (_key_,)?_value_ in _collection_'");
          }

          var selectAsName = / as /.test(match[0]) && match[1],
              //item.modelValue
          displayName = match[2] || match[1],
              //item.label
          valueName = match[5] || match[7],
              //item (value)
          keyName = match[6],
              //(key)
          groupByName = match[3] || '',
              //item.groupName
          disableWhenName = match[4] || '',
              //item.disableWhenName
          trackByName = match[9] || displayName,
              //item.id
          valueMatches = match[8].match(VALUES_REGEXP),
              //collection
          valueTitle = valueName,
              keyTitle = keyName;

          if (keyName) {
            //convert object data sources format to array data sources format
            valueName = 'i';
            selectAsName = valueName + '.' + (selectAsName || valueTitle);
            trackByName = valueName + '.' + keyName;
            displayName = valueName + '.' + displayName;
            keyName = valueName + '.' + keyName;
            groupByName = groupByName ? valueName + '.' + groupByName : undefined;
            disableWhenName = disableWhenName ? valueName + '.' + disableWhenName : undefined;
          }

          var valuesName = valueMatches[1],
              //collection
          filteredValuesName = valuesName + (valueMatches[3] || ''),
              //collection | filter
          valuesFnName = valuesName + (valueMatches[2] || ''); //collection()

          var selectAsFn = selectAsName && $parse(selectAsName),
              displayFn = $parse(displayName),
              groupByFn = $parse(groupByName),
              disableWhenFn = $parse(disableWhenName),
              filteredValuesFn = $parse(filteredValuesName),
              valuesFn = $parse(valuesFnName),
              trackByFn = $parse(trackByName);
          var multiplePlaceholderFn = $interpolate(attrs.multiplePlaceholder || ''),
              listPlaceholderFn = $interpolate(attrs.listPlaceholder || ''),
              placeholderFn = $interpolate(attrs.placeholder || ''),
              optionsFn = $parse(attrs.oiSelectOptions),
              isOldAngular = angular.version.major <= 1 && angular.version.minor <= 3;
          var keyUpDownWerePressed,
              matchesWereReset,
              timeoutPromise,
              lastQuery,
              removedItem,
              multiple = angular.isDefined(attrs.multiple),
              multipleLimit,
              newItemFn;
          var listElement = angular.element(element[0].querySelector('.oi-select__dropdown')),
              placeholder = placeholderFn(scope),
              multiplePlaceholder = multiplePlaceholderFn(scope),
              listPlaceholder = listPlaceholderFn(scope),
              elementOptions = optionsFn(scope.$parent) || {},
              options = angular.extend({
            cleanModel: elementOptions.newItem === 'prompt'
          }, oiSelect.options, elementOptions),
              editItem = options.editItem,
              editItemIsCorrected = editItem === 'correct',
              waitTime = 0,
              threshold = 30,
              throttle = 500,
              noMoreItems = false,
              offsetTop = 0,
              keepQuery = false;

          var isPageVariableExists = function isPageVariableExists() {
            return valuesFnName.match(/\$page/);
          };

          element.addClass('oi-select'); // Override the standard $isEmpty because an empty array means the input is empty.

          ctrl.$isEmpty = function (value) {
            return !exists(value);
          };
          /**
           * Merge promise results
           * @param baseObject
           * @param mergeObject
           * @return {*}
           */


          var mergeGroups = function mergeGroups(baseObject, mergeObject) {
            var baseObjectKeys = Object.keys(baseObject);
            baseObjectKeys.forEach(function (baseKey) {
              if (mergeObject[baseKey] !== undefined && Array.isArray(mergeObject[baseKey])) baseObject[baseKey] = baseObject[baseKey].concat(mergeObject[baseKey]);
            });
            return baseObject;
          };

          if (editItem === true || editItem === 'correct') {
            editItem = 'oiSelectEditItem';
          }

          var editItemFn = editItem ? $injector.get(editItem) : angular.noop,
              removeItemFn = $parse(options.removeItemFn);
          match = options.searchFilter.split(':');
          var searchFilter = $filter(match[0]),
              searchFilterOptionsFn = $parse(match[1]);
          match = options.dropdownFilter.split(':');
          var dropdownFilter = $filter(match[0]),
              dropdownFilterOptionsFn = $parse(match[1]);
          match = options.listFilter.split(':');
          var listFilter = $filter(match[0]),
              listFilterOptionsFn = $parse(match[1]);
          match = options.groupFilter.split(':');
          var groupFilter = $filter(match[0]),
              groupFilterOptionsFn = $parse(match[1]);

          if (options.newItemFn) {
            newItemFn = $parse(options.newItemFn);
          } else {
            newItemFn = function newItemFn(scope, locals) {
              return (optionsFn(locals) || {}).newItemModel || locals.$query;
            };
          }

          if (options.cleanModel && (!editItem || editItemIsCorrected)) {
            element.addClass('oi-select_cleanMode');
          }

          if (angular.isDefined(attrs.autofocus)) {
            $timeout(function () {
              inputElement[0].focus();
            });
          }

          if (angular.isDefined(attrs.keepQuery)) {
            keepQuery = attrs.keepQuery === 'true';
          }

          if (angular.isDefined(attrs.readonly)) {
            watchers.readonly = scope.$parent.$watch(attrs.readonly, function (value) {
              if (value === undefined) {
                value = true;
              }

              inputElement.attr('readonly', value);
            });
          }

          if (angular.isDefined(attrs.tabindex)) {
            inputElement.attr('tabindex', attrs.tabindex);
            element[0].removeAttribute('tabindex');
          }

          if (options.maxlength) {
            inputElement.attr('maxlength', options.maxlength);
          }

          element[options.minlength ? 'addClass' : 'removeClass']('oi-select_minlenght');
          attrs.$observe('disabled', function (value) {
            inputElement.prop('disabled', value); //hide empty string with input

            if (multiple && ctrl.$modelValue && ctrl.$modelValue.length) {
              scope.inputHide = value;
            }
          });
          watchers.multipleLimit = scope.$parent.$watch(attrs.multipleLimit, function (value) {
            multipleLimit = Number(value) || Infinity;
          });
          watchers.multiple = scope.$parent.$watch(attrs.multiple, function (multipleValue) {
            multiple = multipleValue === undefined ? angular.isDefined(attrs.multiple) : multipleValue;
            element[multiple ? 'addClass' : 'removeClass']('oi-select_multiple');
            element[!multiple ? 'addClass' : 'removeClass']('oi-select_single');
          });

          function valueChangedManually() {
            //case: clean model; prompt + editItem: 'correct'; initial value = defined/undefined
            if (editItemIsCorrected) {
              element.removeClass('oi-select__cleanMode');
            }

            editItemIsCorrected = false;
          }

          watchers.ngModel = scope.$parent.$watch(attrs.ngModel, function (value, oldValue) {
            var output = compact(value),
                promise = $q.when(output);
            setTimeout(function () {
              return modifyPlaceholder();
            });
            if (exists(oldValue) && value !== oldValue) valueChangedManually();
            if (multiple === false) restoreInput();

            if (selectAsFn && exists(value)) {
              promise = getMatches(null, value).then(function (collection) {
                return oiUtils.intersection(output, collection, null, selectAs);
              });
              timeoutPromise = null; //`resetMatches` should not cancel the `promise`
            }

            if (multiple && attrs.disabled && !exists(value)) {
              //case: multiple, disabled=true + remove all items
              scope.inputHide = false;
            }

            promise.then(function (collection) {
              scope.output = collection;

              if (collection.length !== output.length) {
                scope.removeItem(collection.length); //if newItem was not created
              }
            });
          });
          watchers.query = scope.$watch('query', function (inputValue, oldValue) {
            //terminated symbol
            if (saveOn(inputValue.slice(0, -1), inputValue.slice(-1))) return; //length less then minlength

            if (String(inputValue).length < options.minlength) return; //We don't get matches if nothing added into matches list

            if (inputValue !== oldValue && (!scope.oldQuery || inputValue) && !matchesWereReset) {
              listElement[0].scrollTop = 0;

              if (inputValue) {
                getMatches(inputValue);
                scope.oldQuery = null;
              } else if (multiple) {
                resetMatches();
                matchesWereReset = true;
              }
            }

            matchesWereReset = false;
          });
          watchers.groups = scope.$watch('groups', function (groups) {
            if (oiUtils.groupsIsEmpty(groups)) {
              scope.isOpen = false;
            } else if (!scope.isOpen && !attrs.disabled) {
              scope.isOpen = true;
              scope.isFocused = true;
            }
          });
          watchers.isFocused = scope.$watch('isFocused', function (isFocused) {
            $animate[isFocused ? 'addClass' : 'removeClass'](element, 'oi-select_focused', !isOldAngular && {
              tempClasses: 'oi-select_focused-animate'
            });
          });

          var onScrollFn = function onScrollFn(e) {
            var target = e.target;
            offsetTop = target.scrollTop;

            if (target.scrollTop + threshold + target.clientHeight >= target.scrollHeight) {
              if (!noMoreItems) {
                getMatches(scope.query, undefined, true);
              }
            }
          };

          var scrollToLastScrolledItem = function scrollToLastScrolledItem(scrollPosition) {
            setTimeout(function () {
              var optionsGroup = element[0].querySelector('.oi-select__dropdown');
              optionsGroup.scrollTop = scrollPosition;
            }, 10);
          };

          var throttledOnScrollListener = throttleFn(onScrollFn, throttle);
          watchers.isOpen = scope.$watch('isOpen', function (isOpen) {
            $animate[isOpen ? 'addClass' : 'removeClass'](element, 'oi-select_open', !isOldAngular && {
              tempClasses: 'oi-select_open-animate'
            });

            if (isOpen) {
              if (isPageVariableExists()) setTimeout(function () {
                return element[0].addEventListener('scroll', throttledOnScrollListener, true);
              }, 100);
            } else {
              element[0].removeEventListener('scroll', throttledOnScrollListener, true);
            }
          });
          watchers.isEmptyList = scope.$watch('isEmptyList', function (isEmptyList) {
            $animate[isEmptyList ? 'addClass' : 'removeClass'](element, 'oi-select_emptyList', !isOldAngular && {
              tempClasses: 'oi-select_emptyList-animate'
            });
          });
          watchers.showLoader = scope.$watch('showLoader', function (isLoading) {
            $animate[isLoading ? 'addClass' : 'removeClass'](element, 'oi-select__loading', !isOldAngular && {
              tempClasses: 'oi-select__loading-animate'
            });
          });

          scope.addItem = function addItem(option) {
            lastQuery = scope.query; //duplicate

            if (multiple && oiUtils.intersection(scope.output, [option], trackBy, trackBy).length) return; //limit is reached

            if (scope.output.length >= multipleLimit) {
              blinkClass('oi-select_limited');
              return;
            }

            var optionGroup = scope.groups[getGroupName(option)] = scope.groups[getGroupName(option)] || [];
            var modelOption = selectAsFn ? selectAs(option) : option;
            optionGroup.splice(optionGroup.indexOf(option), 1);

            if (multiple) {
              ctrl.$setViewValue(angular.isArray(ctrl.$modelValue) ? ctrl.$modelValue.concat(modelOption) : [modelOption]);
            } else {
              ctrl.$setViewValue(modelOption);
              restoreInput();
            }

            if (oiUtils.groupsIsEmpty(scope.groups)) {
              scope.groups = {}; //it is necessary for groups watcher
            }

            if (!multiple && !options.closeList) {
              resetMatches({
                query: true
              });
            }

            valueChangedManually();
            scope.oldQuery = scope.oldQuery || scope.query;
            scope.query = '';
            scope.backspaceFocus = false;
          };

          scope.removeItem = function removeItem(position) {
            if (attrs.disabled || multiple && position < 0) return;
            removedItem = multiple ? ctrl.$modelValue[position] : ctrl.$modelValue;
            $q.when(removeItemFn(scope.$parent, {
              $item: removedItem
            })).then(function () {
              if (!multiple && !scope.inputHide) return;

              if (multiple) {
                ctrl.$modelValue.splice(position, 1);
                ctrl.$setViewValue([].concat(ctrl.$modelValue));
              } else {
                cleanInput();

                if (options.cleanModel) {
                  ctrl.$setViewValue(undefined);
                }
              }

              if (multiple || !scope.backspaceFocus) {
                scope.query = editItemFn(removedItem, lastQuery, getLabel, editItemIsCorrected, element) || '';
              }

              if (multiple && options.closeList) {
                resetMatches({
                  query: true
                });
              }
            });
          };

          scope.setSelection = function (index) {
            if (!keyUpDownWerePressed && scope.selectorPosition !== index) {
              setOption(listElement, index);
            } else {
              keyUpDownWerePressed = false;
            }
          };

          scope.keyUp = function keyUp(event) {
            //scope.query is actual
            switch (event.keyCode) {
              case 8:
                /* backspace */
                if (!scope.query.length && (!multiple || !scope.output.length)) {
                  resetMatches();
                }

            }
          };

          scope.keyDown = function keyDown(event) {
            var top = 0,
                bottom = scope.order.length - 1;

            switch (event.keyCode) {
              case 38:
                /* up */
                scope.selectorPosition = angular.isNumber(scope.selectorPosition) ? scope.selectorPosition : top;
                setOption(listElement, scope.selectorPosition === top ? bottom : scope.selectorPosition - 1);
                keyUpDownWerePressed = true;
                break;

              case 40:
                /* down */
                scope.selectorPosition = angular.isNumber(scope.selectorPosition) ? scope.selectorPosition : top - 1;
                setOption(listElement, scope.selectorPosition === bottom ? top : scope.selectorPosition + 1);
                keyUpDownWerePressed = true;

                if (!scope.query.length && !scope.isOpen) {
                  getMatches();
                }

                if (scope.inputHide) {
                  cleanInput();
                }

                break;

              case 37:
              /* left */

              case 39:
                /* right */
                break;

              case 9:
                /* tab */
                saveOn('tab');
                break;

              case 13:
                /* enter */
                saveOn('enter');
                event.preventDefault(); // Prevent the event from bubbling up as it might otherwise cause a form submission

                break;

              case 32:
                /* space */
                saveOn('space');
                break;

              case 27:
                /* esc */
                if (!multiple) {
                  restoreInput();

                  if (options.cleanModel) {
                    ctrl.$setViewValue(removedItem);
                  }
                }

                resetMatches();
                break;

              case 8:
                /* backspace */
                if (!scope.query.length) {
                  if (!multiple || editItem) {
                    scope.backspaceFocus = true;
                  }

                  if (scope.backspaceFocus && scope.output && (!multiple || scope.output.length)) {
                    //prevent restoring last deleted option
                    scope.removeItem(scope.output.length - 1);

                    if (editItem) {
                      event.preventDefault();
                    }

                    break;
                  }

                  scope.backspaceFocus = !scope.backspaceFocus;
                  break;
                }

              default:
                /* any key */
                if (scope.inputHide) {
                  cleanInput();
                }

                scope.backspaceFocus = false;
                return false;
              //preventDefaults
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

          if (!clickEvent) {
            clickEvent = true;
            element[0].addEventListener('click', click, true); //triggered before add or delete item event
          }

          scope.$on('$destroy', function () {
            element[0].removeEventListener('click', click, true);
          });

          function blinkClass(name) {
            var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 500;
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
            if (scope.query.length < options.minlength) return; //option is disabled

            if (oiUtils.contains(element[0], event.target, 'disabled')) return; //limit is reached

            if (scope.output.length >= multipleLimit && oiUtils.contains(element[0], event.target, 'select-dropdown')) return;

            if (scope.inputHide) {
              scope.removeItem(0); //because click on border (not on chosen item) doesn't remove chosen element
            }

            if (scope.isOpen && options.closeList && (event.target.nodeName !== 'INPUT' || !scope.query.length)) {
              //do not reset if you are editing the query
              resetMatches({
                query: options.editItem && !editItemIsCorrected
              });
              scope.$evalAsync();
            } else {
              getMatches(scope.query);
            }
          }

          scope.focus = function () {
            if (scope.isFocused) return;
            scope.isFocused = true;
            if (attrs.disabled) return;
            scope.backspaceFocus = false;
          };

          scope.blur = function () {
            var resetOptions = keepQuery ? {
              query: true
            } : {};
            scope.isFocused = false;
            if (!multiple) restoreInput();

            if (!saveOn('blur')) {
              resetMatches(resetOptions);
            }

            scope.$evalAsync();
          };

          function saveOn(query, triggerName) {
            if (!triggerName) {
              triggerName = query;
              query = scope.query;
            }

            var isTriggered = options.saveTrigger.split(' ').indexOf(triggerName) + 1,
                isNewItem = options.newItem && query,
                selectedOrder = triggerName !== 'blur' ? scope.order[scope.selectorPosition] : null,
                //do not save selected element in dropdown list on blur
            itemPromise;

            if (isTriggered && (isNewItem || selectedOrder && !getDisableWhen(selectedOrder))) {
              scope.showLoader = true;
              itemPromise = $q.when(selectedOrder || newItemFn(scope.$parent, {
                $query: query
              }));
              itemPromise.then(function (data) {
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
              }).catch(function () {
                blinkClass('oi-select_invalid-item');
                scope.showLoader = false;
              });
              return true;
            }
          }

          function isEmpty(model) {
            if (model === undefined || model === null) {
              return false;
            } else if (Array.isArray(model)) {
              return !model.length;
            } else if (_typeof(model) === "object") {
              return !Object.keys(model).length;
            }

            return !model.length;
          }

          function modifyPlaceholder() {
            var currentPlaceholder = placeholder;
            if (multiple) currentPlaceholder = isEmpty(ctrl.$modelValue) ? placeholder : multiplePlaceholder;
            inputElement.attr('placeholder', currentPlaceholder);
          }

          function trackBy(item) {
            return oiUtils.getValue(valueName, item, scope.$parent, trackByFn);
          }

          function selectAs(item) {
            return oiUtils.getValue(valueName, item, scope.$parent, selectAsFn);
          }

          function getLabel(item) {
            return oiUtils.getValue(valueName, item, scope.$parent, displayFn);
          }

          function getDisableWhen(item) {
            return scope.isEmptyList || oiUtils.getValue(valueName, item, scope.$parent, disableWhenFn);
          }

          function getGroupName(option) {
            return oiUtils.getValue(valueName, option, scope.$parent, groupByFn) || '';
          }

          function filter(list) {
            return oiUtils.getValue(valuesName, list, scope.$parent, filteredValuesFn);
          }

          function compact(value) {
            value = value instanceof Array ? value : value ? [value] : [];
            return value.filter(function (item) {
              return item !== undefined && (item instanceof Array && item.length || selectAsFn || getLabel(item));
            });
          }

          function exists(value) {
            return !!compact(value).length;
          }

          function getMatches(query, selectedAs) {
            var append = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            if (append) {
              scope.page++;
            } else {
              scope.page = 0;
            }

            scope.isEmptyList = false;

            if (timeoutPromise && waitTime) {
              $timeout.cancel(timeoutPromise); //cancel previous timeout
            } // Updating wait time before first promise will be execute


            if (elementOptions.debounce && elementOptions.minlength) {
              waitTime = options.debounce;
            }

            timeoutPromise = $timeout(function () {
              var values = valuesFn(scope.$parent, {
                $query: query,
                $selectedAs: selectedAs,
                $page: scope.page
              }) || '';
              scope.selectorPosition = options.newItem === 'prompt' ? false : 0;

              if (!query && !selectedAs) {
                scope.oldQuery = null;
              }

              if (values.$promise && !values.$resolved || angular.isFunction(values.then)) {
                waitTime = options.debounce;
              }

              scope.showLoader = true;
              return $q.when(values.$promise || values).then(function (values) {
                if (!append) {
                  scope.groups = {};
                  noMoreItems = false;
                } else {
                  scrollToLastScrolledItem(offsetTop); // stop it when no more values found

                  if (!values.length) noMoreItems = true;
                }

                if (values && keyName) {
                  //convert object data sources format to array data sources format
                  var arr = [];
                  angular.forEach(values, function (value, key) {
                    if (key.toString().charAt(0) !== '$') {
                      var item = {};
                      item[keyTitle] = key;
                      item[valueTitle] = value;
                      arr.push(item);
                    }
                  });
                  values = arr;
                }

                if (values && !selectedAs) {
                  var outputValues = multiple ? scope.output : [];
                  var filteredList = listFilter(values, query, getLabel, listFilterOptionsFn(scope.$parent), element);
                  var withoutIntersection = oiUtils.intersection(filteredList, outputValues, trackBy, trackBy, true);
                  var filteredOutput = filter(withoutIntersection); //add element with placeholder to empty list

                  if (!filteredOutput.length) {
                    scope.isEmptyList = true;

                    if (listPlaceholder) {
                      var context = {};
                      displayFn.assign(context, listPlaceholder);
                      filteredOutput = [context[valueName]];
                    }
                  }

                  if (append) {
                    mergeGroups(scope.groups, group(filteredOutput));
                    scrollToLastScrolledItem(offsetTop);
                  } else {
                    scope.groups = group(filteredOutput);
                  }
                }

                updateGroupPos();
                return values;
              }).finally(function () {
                scope.showLoader = false;

                if (options.closeList && !options.cleanModel) {
                  //case: prompt
                  $timeout(function () {
                    setOption(listElement, 0);
                  });
                }
              });
            }, waitTime);
            return timeoutPromise;
          }

          function updateGroupPos() {
            var i,
                key,
                value,
                collectionKeys = [],
                groupCount = 0;
            scope.order = [];
            scope.groupPos = {};

            for (key in scope.groups) {
              if (scope.groups.hasOwnProperty(key) && key.charAt(0) != '$') {
                collectionKeys.push(key);
              }
            }

            if (isOldAngular) {
              collectionKeys.sort(); //TODO: Think of a way which does not depend on the order in which Angular displays objects by ngRepeat
            }

            for (i = 0; i < collectionKeys.length; i++) {
              key = collectionKeys[i];
              value = scope.groups[key];
              scope.order = scope.order.concat(value);
              scope.groupPos[key] = groupCount;
              groupCount += value.length;
            }
          }

          function resetMatches() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
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

            if (timeoutPromise) {
              $timeout.cancel(timeoutPromise); //cancel previous timeout
            }
          }

          function setOption(listElement, position) {
            scope.selectorPosition = position;
            oiUtils.scrollActiveOption(listElement[0], listElement.find('li')[position]);
          }

          function group(input) {
            var optionGroups = {
              '': []
            },
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

          scope.rendered = true;
        }
      };
    }
  };
}];

var name = "@glook/oi.select";
var license = "MIT";
var version = "0.4.4";
var repository = {
	type: "git",
	url: "git://github.com/glook/oi.select.git"
};
var homepage = "https://github.com/glook/oi.select";
var devDependencies = {
	"@babel/core": "^7.3.4",
	"@babel/preset-env": "^7.3.4",
	autoprefixer: "^9.5.0",
	"babel-plugin-angularjs-annotate": "^0.10.0",
	cssnano: "^4.1.10",
	"jasmine-core": "3.3.0",
	"jasmine-jquery": "2.1.1",
	karma: "4.0.1",
	"karma-chrome-launcher": "2.2.0",
	"karma-coverage": "1.1.2",
	"karma-firefox-launcher": "1.1.0",
	"karma-ie-launcher": "1.0.0",
	"karma-jasmine": "2.0.1",
	"karma-jasmine-jquery": "0.1.1",
	"karma-ng-html2js-preprocessor": "1.0.0",
	"karma-opera-launcher": "1.0.0",
	"karma-phantomjs-launcher": "1.0.4",
	"karma-sauce-launcher": "2.0.2",
	lodash: "^4.17.11",
	"node-sass": "^4.9.4",
	postcss: "^7.0.14",
	"postcss-banner": "^3.0.1",
	rollup: "^1.6.0",
	"rollup-plugin-babel": "^4.3.2",
	"rollup-plugin-babel-minify": "^8.0.0",
	"rollup-plugin-html": "^0.2.1",
	"rollup-plugin-json": "^3.1.0",
	"rollup-plugin-livereload": "^1.0.0",
	"rollup-plugin-sass": "^1.1.0",
	"rollup-plugin-serve": "^1.0.1",
	"rollup-watch": "^4.3.1",
	yargs: "^13.2.2"
};
var browser = "index.js";
var style = "dist/select.min.css";
var main = "dist/select-tpls.js";
var peerDependencies = {
	angular: ">=1.2",
	"angular-sanitize": ">=1.2"
};
var description = "**[Download](https://github.com/glook/oi.select/releases)**";
var bugs = {
	url: "https://github.com/glook/oi.select/issues"
};
var directories = {
	doc: "docs"
};
var dependencies = {
};
var scripts = {
	build: "node_modules/.bin/rollup -c",
	start: "node_modules/.bin/rollup -c -w"
};
var author = "Andrey Polyakov";
var json = {
	name: name,
	license: license,
	version: version,
	repository: repository,
	homepage: homepage,
	devDependencies: devDependencies,
	browser: browser,
	style: style,
	main: main,
	peerDependencies: peerDependencies,
	description: description,
	bugs: bugs,
	directories: directories,
	dependencies: dependencies,
	scripts: scripts,
	author: author
};

var version$1 = (function () {
  var full = json.version || '0.0.1';

  var _full$split = full.split('.'),
      _full$split2 = _slicedToArray(_full$split, 3),
      major = _full$split2[0],
      minor = _full$split2[1],
      dot = _full$split2[2];

  return {
    full: full,
    major: major,
    minor: minor,
    dot: dot
  };
});

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
var oiSelectProvider = (function () {
  return {
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
    version: version$1(),
    $get: function $get() {
      return {
        options: this.options,
        version: this.version
      };
    }
  };
});

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
function oiSelectEditItemFactory () {
  return function (removedItem, lastQuery, getLabel, itemIsCorrected) {
    return itemIsCorrected ? '' : getLabel(removedItem);
  };
}

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
function oiSelectEscapeFactory () {
  var rEscapableCharacters = /[-\/\\^$*+?.()|[\]{}]/g; // cache escape + match String

  var sEscapeMatch = '\\$&';
  return function (string) {
    return String(string).replace(rEscapableCharacters, sEscapeMatch);
  };
}

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
function oiUtilsFactory (
/* @ngInject */
$document, $timeout) {
  /**
   * Check to see if a DOM element is a descendant of another DOM element.
   *
   * @param {DOM element} container
   * @param {DOM element} contained
   * @param {string} class name of element in container
   * @returns {boolean}
   */
  function contains(container, contained, className) {
    var current = contained;

    while (current && current.ownerDocument && current.nodeType !== 11) {
      if (className) {
        if (current === container) {
          return false;
        }

        if (current.className.indexOf(className) >= 0) {
          //current.classList.contains(className) doesn't work in IE9
          return true;
        }
      } else {
        if (current === container) {
          return true;
        }
      }

      current = current.parentNode;
    }

    return false;
  }
  /**
   * Simulate focus/blur events of the inner input element to the outer element
   *
   * @param {element} outer element
   * @param {element} inner input element
   * @returns {function} deregistration function for listeners.
   */


  function bindFocusBlur(element, inputElement) {
    var isFocused, isMousedown, isBlur;
    $document[0].addEventListener('click', clickHandler, true);
    element[0].addEventListener('mousedown', mousedownHandler, true);
    element[0].addEventListener('blur', blurHandler, true);
    inputElement.on('focus', focusHandler);

    function blurHandler(event) {
      if (event && event.target.nodeName !== 'INPUT') return; //for IE

      isBlur = false;
      isFocused = false;

      if (isMousedown) {
        isBlur = true;
        return;
      }

      $timeout(function () {
        element.triggerHandler('blur'); //conflict with current live cycle (case: multiple=none + tab)
      });
    }

    function focusHandler() {
      if (!isFocused) {
        isFocused = true;
        $timeout(function () {
          element.triggerHandler('focus'); //conflict with current live cycle (case: multiple=none + tab)
        });
      }
    }

    function mousedownHandler() {
      isMousedown = true;
    }

    function clickHandler(event) {
      isMousedown = false;
      var activeElement = event.target;
      var isSelectElement = contains(element[0], activeElement);

      if (isBlur && !isSelectElement) {
        blurHandler();
      }

      if (isSelectElement && activeElement.nodeName !== 'INPUT') {
        $timeout(function () {
          inputElement[0].focus();
        });
      }

      if (!isSelectElement && isFocused) {
        isFocused = false;
      }
    }

    return function () {
      $document[0].removeEventListener('click', clickHandler, true);
      element[0].removeEventListener('mousedown', mousedownHandler, true);
      element[0].removeEventListener('blur', blurHandler, true);
      inputElement.off('focus', focusHandler);
    };
  }
  /**
   * Sets the selected item in the dropdown menu
   * of available options.
   *
   * @param {object} list
   * @param {object} item
   */


  function scrollActiveOption(list, item) {
    var y, height_menu, height_item, scroll, scroll_top, scroll_bottom;

    if (item) {
      height_menu = list.offsetHeight;
      height_item = getWidthOrHeight(item, 'height', 'margin'); //outerHeight(true);

      scroll = list.scrollTop || 0;
      y = getOffset(item).top - getOffset(list).top + scroll;
      scroll_top = y;
      scroll_bottom = y - height_menu + height_item; //TODO Make animation

      if (y + height_item > height_menu + scroll) {
        list.scrollTop = scroll_bottom;
      } else if (y < scroll) {
        list.scrollTop = scroll_top;
      }
    }
  } // Used for matching numbers


  var core_pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;
  var rnumnonpx = new RegExp("^(" + core_pnum + ")(?!px)[a-z%]+$", "i");

  function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
    var i = extra === (isBorderBox ? 'border' : 'content') ? // If we already have the right measurement, avoid augmentation
    4 : // Otherwise initialize for horizontal or vertical properties
    name === 'width' ? 1 : 0,
        val = 0,
        cssExpand = ['Top', 'Right', 'Bottom', 'Left']; //TODO Use angular.element.css instead of getStyleValue after https://github.com/caitp/angular.js/commit/92bbb5e225253ebddd38ef5735d66ffef76b6a14 will be applied

    function getStyleValue(name) {
      return parseFloat(styles[name]);
    }

    for (; i < 4; i += 2) {
      // both box models exclude margin, so add it if we want it
      if (extra === 'margin') {
        val += getStyleValue(extra + cssExpand[i]);
      }

      if (isBorderBox) {
        // border-box includes padding, so remove it if we want content
        if (extra === 'content') {
          val -= getStyleValue('padding' + cssExpand[i]);
        } // at this point, extra isn't border nor margin, so remove border


        if (extra !== 'margin') {
          val -= getStyleValue('border' + cssExpand[i] + 'Width');
        }
      } else {
        val += getStyleValue('padding' + cssExpand[i]); // at this point, extra isn't content nor padding, so add border

        if (extra !== 'padding') {
          val += getStyleValue('border' + cssExpand[i] + 'Width');
        }
      }
    }

    return val;
  }

  function getOffset(elem) {
    var docElem,
        win,
        box = elem.getBoundingClientRect(),
        doc = elem && elem.ownerDocument;

    if (!doc) {
      return;
    }

    docElem = doc.documentElement;
    win = getWindow(doc);
    return {
      top: box.top + win.pageYOffset - docElem.clientTop,
      left: box.left + win.pageXOffset - docElem.clientLeft
    };
  }

  function getWindow(elem) {
    return elem != null && elem === elem.window ? elem : elem.nodeType === 9 && elem.defaultView;
  }

  function getWidthOrHeight(elem, name, extra) {
    // Start with offset property, which is equivalent to the border-box value
    var valueIsBorderBox = true,
        val = name === 'width' ? elem.offsetWidth : elem.offsetHeight,
        styles = window.getComputedStyle(elem, null);
 //jQuery.support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box";
    // some non-html elements return undefined for offsetWidth, so check for null/undefined
    // svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
    // MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668

    if (val <= 0 || val == null) {
      // Fall back to computed then uncomputed css if necessary
      val = styles[name];

      if (val < 0 || val == null) {
        val = elem.style[name];
      } // Computed unit is not pixels. Stop here and return.


      if (rnumnonpx.test(val)) {
        return val;
      } // we need the check for style in case a browser which returns unreliable values
      // for getComputedStyle silently falls back to the reliable elem.style
      //valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );
      // Normalize "", auto, and prepare for extra


      val = parseFloat(val) || 0;
    } // use the active box-sizing model to add/subtract irrelevant styles


    return val + augmentWidthOrHeight(elem, name, extra || ("content"), valueIsBorderBox, styles);
  }

  function groupsIsEmpty(groups) {
    for (var k in groups) {
      if (groups.hasOwnProperty(k) && groups[k].length) {
        return false;
      }
    }

    return true;
  } //lodash _.intersection + filter + invert


  function intersection(xArr, yArr, xFilter, yFilter, invert) {
    var i,
        j,
        n,
        filteredX,
        filteredY,
        out = invert ? [].concat(xArr) : [];

    for (i = 0, n = xArr.length; i < xArr.length; i++) {
      filteredX = xFilter ? xFilter(xArr[i]) : xArr[i];

      for (j = 0; j < yArr.length; j++) {
        filteredY = yFilter ? yFilter(yArr[j]) : yArr[j];

        if (angular.equals(filteredX, filteredY, xArr, yArr, i, j)) {
          invert ? out.splice(i + out.length - n, 1) : out.push(yArr[j]);
          break;
        }
      }
    }

    return out;
  }

  function getValue(valueName, item, scope, getter) {
    var locals = {}; //'name.subname' -> {name: {subname: item}} -> locals'

    valueName.split('.').reduce(function (previousValue, currentItem, index, arr) {
      return previousValue[currentItem] = index < arr.length - 1 ? {} : item;
    }, locals);
    return getter(scope, locals);
  }

  return {
    contains: contains,
    bindFocusBlur: bindFocusBlur,
    scrollActiveOption: scrollActiveOption,
    groupsIsEmpty: groupsIsEmpty,
    getValue: getValue,
    intersection: intersection
  };
}

var oiSelectServices = angular.module('oi.select.services', []).provider('oiSelect', oiSelectProvider).factory('oiSelectEscape', oiSelectEscapeFactory).factory('oiSelectEditItem', oiSelectEditItemFactory).factory('oiUtils', oiUtilsFactory).name;

var oiSelectFilters = angular.module('oi.select.filters', []).filter('oiSelectGroup', ['$sce', function ($sce) {
  return function (label) {
    return $sce.trustAsHtml(label);
  };
}]).filter('oiSelectCloseIcon', ['$sce', function ($sce) {
  return function (label) {
    var closeIcon = '<span class="oi-select__remove">×</span>';
    return $sce.trustAsHtml(label + closeIcon);
  };
}]).filter('oiSelectHighlight', ['$sce', 'oiSelectEscape', function ($sce, oiSelectEscape) {
  return function (label, query) {
    var html;

    if (query.length > 0 || angular.isNumber(query)) {
      label = label.toString();
      query = oiSelectEscape(query);
      html = label.replace(new RegExp(query, 'gi'), '<strong>$&</strong>');
    } else {
      html = label;
    }

    return $sce.trustAsHtml(html);
  };
}]).filter('oiSelectAscSort', ['oiSelectEscape', function (oiSelectEscape) {
  function ascSort(input, query, getLabel, options) {
    var i,
        j,
        isFound,
        output,
        output1 = [],
        output2 = [],
        output3 = [],
        output4 = [];

    if (query) {
      query = oiSelectEscape(query).toLocaleLowerCase();

      for (i = 0, isFound = false; i < input.length; i++) {
        isFound = getLabel(input[i]).toLocaleLowerCase().match(new RegExp(query));

        if (!isFound && options && (options.length || options.fields)) {
          for (j = 0; j < options.length; j++) {
            if (isFound) break;
            isFound = String(input[i][options[j]]).toLocaleLowerCase().match(new RegExp(query));
          }
        }

        if (isFound) {
          output1.push(input[i]);
        }
      }

      for (i = 0; i < output1.length; i++) {
        if (getLabel(output1[i]).toLocaleLowerCase().match(new RegExp('^' + query))) {
          output2.push(output1[i]);
        } else {
          output3.push(output1[i]);
        }
      }

      output = output2.concat(output3);

      if (options && (options === true || options.all)) {
        inputLabel: for (i = 0; i < input.length; i++) {
          for (j = 0; j < output.length; j++) {
            if (input[i] === output[j]) {
              continue inputLabel;
            }
          }

          output4.push(input[i]);
        }

        output = output.concat(output4);
      }
    } else {
      output = [].concat(input);
    }

    return output;
  }

  return ascSort;
}]).filter('none', function () {
  return function (input) {
    return input;
  };
}).name;

/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
angular.module('oi.select', [oiSelectFilters, oiSelectServices]).directive('oiSelect', oiSelectDirective);
