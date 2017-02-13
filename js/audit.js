window.Audit = (function () {
    var callback;
    var totalViolations = 0;
    var passedViolations = [];
    var disabledViolations = [];
    var alerts = [];
    var alertData = {
        level: {},
        category: {},
        region: {},
        service: {}
    };
    var executionIsFinished;
    var errors = [];
    var pie;

    var hasOld = false;
    var colorPalette = {
        SeverityTones: {
            Emergency: '#770a0a',
            Alert: '#ad0707',
            Critical: '#e53e2b',
            Error: '#fc847c',
            Warning: '#e49530',
            Notice: '#eac907',
            Informational: '#6b6b6b',
            Debug: '#c4c4c4'
        },
        Passed: '#2dbf74',
        Disabled: '#cccccc',
        PurpleTones: ['#582a7f', '#bf4a95', '#c4c4c4', '#6b6b6b', '#272e39'],
        CoolTones: ['#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'],
        RainbowTones: ['#582a7f', '#bf4a95', '#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'],
        Default: d3.schemeCategory20
    };

    var containers = {
        mainDataContainerSelector: '.list',
        noAuditResourcesMessageSelector: '#no-violation-resources',
        noViolationsMessageSelector: '#no-violations-view',
        pieChartSelector: '.pie',
        errorsContSelector: '#advisor-errors',
        mainCont: '.audit-list',
        planIsExecuting: '.resources-are-loading',
        endOfViolationLabel: '.violation-divider',
        warningBlock: '.warning-block'
    };

    var headerTpl = $.templates("#list-header-tmpl"),
        violationTpl = $.templates("#row-tmpl"),
        passedAndDisabledViolations = $.templates("#passed-and-disabled-row"),
        showAllBtnTpl = $("#show-all-btn-tmpl").html(),
        errorTpl = $.templates("#violation-error-tpl");

    function onShowAllBtnClick(elem) {
        var _this = $(elem);
        var list = _this.prev();
        if (list.hasClass('hidden')) {
            list.removeClass('hidden');
            _this.html("show less");
        } else {
            list.addClass('hidden');
            _this.html("view all");
        }
    }

    function onDetailsBtnClick(elem) {
        var _this = $(elem);
        var body = _this.parent().next();
        body.toggleClass('hidden-row');
        var text = _this.text() === "- hide details" ? "+ view details" : "- hide details";
        _this.text(text);
    }

    function refreshClickHandlers(listOfAlerts) {
        $('.resources-link, .resources-title-link').click(function () {
            var _this = $(this);
            var violationId = _this.attr('violation');
            var sortKey = _this.attr('sortKey');

            var params = {
                violationId: _this.attr('violationId'),
                resources: listOfAlerts[sortKey].alerts[violationId].resources,
                suppressions: listOfAlerts[sortKey].alerts[violationId].suppressions,
                color: listOfAlerts[sortKey].color
            };

            openPopup('showViolationResources', params);
        });
        $('.resources-suppressed-link').click(function (event) {
            var _this = $(this);
            var violationId = _this.attr('violation');

            var params = {
                violationId: _this.attr('violationId'),
                suppressions: passedViolations[violationId].suppressions,
                color: colorPalette.Passed
            };

            event.preventDefault();
            event.stopPropagation();
            openPopup('showViolationResources', params);
        });

        $('.more-info-link').click(function () {
            var id = $(this).attr('violation');
            var link = $(this).attr('link');
            var params = {
                id: id,
                link: link
            };
            openPopup('showViolationMoreInfo', params);
        });
        $('.share-link').click(function () {
            openPopup('shareViolation', $(this).attr('violation'));
        });

        $('.show-all').click(function () {
            onShowAllBtnClick(this);
        });

        $('.details-btn').click(function () {
            onDetailsBtnClick(this);
        });
    }

    function getColorRangeByKeys(keys) {
        var colorsRange;

        if (keys.length <= colorPalette.PurpleTones.length) colorsRange = colorPalette.PurpleTones;
        else if (keys.length === colorPalette.CoolTones.length) colorsRange = colorPalette.CoolTones;
        else if (keys.length < 9) colorsRange = colorPalette.RainbowTones;
        else colorsRange = colorPalette.Default;

        return colorsRange;
    }

    function checkIfResourceIsSuppressed (date) {
        if (date === undefined) return false;

        var now = new Date();

        if (date.length) {
          var suppressedDate = new Date(date);
          return suppressedDate.getTime() >= now.getTime();
        }

        return true;
    }

    function removeTotallySuppressedViolations(listOfAlerts, suppressedViolations) {
        Object.keys(suppressedViolations).forEach(function (alertId) {
            delete passedViolations[alertId];
            Object.keys(suppressedViolations[alertId]).forEach(function (key) {
                if (suppressedViolations[alertId][key]) {
                    if (!passedViolations[alertId]) {
                        passedViolations[alertId] = listOfAlerts[key].alerts[alertId];
                    }
                    else {
                        passedViolations[alertId].suppressions = passedViolations[alertId].suppressions.concat(listOfAlerts[key].alerts[alertId].suppressions);
                    }

                    delete listOfAlerts[key].alerts[alertId];
                }
            });
        });
        return listOfAlerts;
    }

    function organizeDataForCurrentRender(sortKey) {
        var keys = Object.keys(alertData[sortKey]);
        var listOfAlerts = {};

        var colorsRange = getColorRangeByKeys(keys);
        var colors = d3.scaleOrdinal(colorsRange);

        var suppressedViolations = {};

        alerts.forEach(function (alert) {
            var key = alert[sortKey];
            if (!listOfAlerts[key]) {
                listOfAlerts[key] = {};
                listOfAlerts[key].alerts = {};
                listOfAlerts[key].color = getColor(alert, sortKey, keys, colors);
            }

            if (!listOfAlerts[key].alerts[alert.id]) {
                listOfAlerts[key].alerts[alert.id] = alert;
                listOfAlerts[key].alerts[alert.id].sortKey = key;
                listOfAlerts[key].alerts[alert.id].resources = [];
                listOfAlerts[key].alerts[alert.id].suppressions = [];
            }
            if (!suppressedViolations[alert.id]) suppressedViolations[alert.id] = {};

            if (alert.resource.isSuppressed) {
                listOfAlerts[key].alerts[alert.id].suppressions.push(alert.resource);
                if (typeof suppressedViolations[alert.id][key] === 'undefined') suppressedViolations[alert.id][key] = true;
            }
            else {
                listOfAlerts[key].alerts[alert.id].resources.push(alert.resource);
                suppressedViolations[alert.id][key] = false;
            }
        });

        listOfAlerts = removeTotallySuppressedViolations(listOfAlerts, suppressedViolations);
        return listOfAlerts;
    }

    function renderErrorsPanel(errors) {
        if (!errors.length) return;

        var errorsList = '';
        errors.forEach(function (error) {
            error.timestamp = utils.formatDate(error.timestamp);
            errorsList += errorTpl.render(error);
        });

        var html =
            '<div class="bg-white layout-padding flex-column layout-margin-bottom-20 md-shadow">' +
            '<div class="subheader flex-grow">Error</div>' +
            errorsList +
            '</div>';

        $(containers.errorsContSelector).html(html);
        $('.advisor-error .view-row').click(function () {
            var _this = $(this);
            var body = _this.next();
            if (body.hasClass('hidden')) {
                body.removeClass('hidden');
                body.slideDown();
            } else {
                body.slideUp(function () {
                    body.addClass('hidden');
                });
            }
        });
    }

    function organizeDataForAdditionalSections(violation) {
        return {
            title: violation.inputs.display_name || violation.resourceName,
            id: violation.resourceName,
            level: violation.inputs.level,
            category: violation.inputs.category,
            description: violation.inputs.description,
            fix: violation.inputs.suggested_action,
            service: violation.inputs.service,
            link: violation.inputs.link,
            resources: [],
            suppressions: [],
            violationId: violation._id
        };
    }

    function getColor(alert, sortKey, keys, colors) {
        var color;
        var key = alert[sortKey];

        if (sortKey === 'level') color = colorPalette.SeverityTones[key];
        if (!color) {
            var index = keys.indexOf(key);
            color = colors(index);
        }

        return color;
    }

    function renderSection(violations, key, color, resultsType) {
        var sectionSummary = { label: key, value: 0, color: color };
        if (!Object.keys(violations).length) {
            return sectionSummary;
        }

        var isPassedOrDisabled = (resultsType === 'PASSED' || resultsType === 'DISABLED');
        var visibleList = '';
        var restList = '';
        var visibleCount = 0;
        var violationsCount = 0;
        var rendered;


        Object.keys(violations).forEach(function (vId) {
            var options = {
                resultsType: resultsType,
                violation: violations[vId]
            };
            if (isPassedOrDisabled) {
                var borderColor = color || colorPalette.SeverityTones[violations[vId].level] || colorPalette.Disabled;
                rendered = '<div style="border-color: ' + borderColor + '">' + passedAndDisabledViolations.render(options) + '</div>';
            } else {
                rendered = violationTpl.render(options);
            }

            if (visibleCount < 5) visibleList += rendered;
            else restList += rendered;
            visibleCount++;

            sectionSummary.value += violations[vId].resources.length;
            if (violations[vId].isViolation) violationsCount += violations[vId].resources.length;
        });

        var headerData = { name: sectionSummary.label, resultsCount: violationsCount, resultsType: resultsType };
        var header = headerTpl.render(headerData);

        var html =
            '<div class="' + headerData.name + ' layout-padding ' + (!isPassedOrDisabled ? 'bg-white' : '') + '" style="margin-bottom: 20px;">' +
                header +
                '<div style="border-color: ' + sectionSummary.color + '">' +
                    visibleList +
                    '<div class="hidden" style="border-color: inherit;">' + restList + '</div>' +
                    ((visibleCount > 5) ? showAllBtnTpl : '') +
                '</div>' +
                (isPassedOrDisabled ? '<div class="violation-divider"></div>' : '') +
            '</div>';

        $(containers.mainDataContainerSelector).append(html);

        return sectionSummary;
    }

    function showNoViolationsMessage() {
        $(containers.noViolationsMessageSelector).removeClass('hidden');
        pie.drawPie([{
            label: "Passed",
            value: Object.keys(passedViolations).length,
            color: colorPalette.Passed
        }]);
    }

    function showResourcesAreBeingLoadedMessage() {
        $(containers.planIsExecuting).removeClass('hidden');
        $(containers.mainCont).addClass('empty');
    }

    function showEmptyViolationsMessage() {
        if (executionIsFinished) {
            showNoViolationsMessage();
            return;
        }
        showResourcesAreBeingLoadedMessage();
    }

    function renderResourcesList(sortKey) {
        $(containers.mainDataContainerSelector).html('');
        if (!alerts || !alerts.length) {
            return;
        }
        if (!alerts.length && !disabledViolations.length && !errors.length) {
            showEmptyViolationsMessage();
            return;
        }

        var pieData = [];
        var listOfAlerts = organizeDataForCurrentRender(sortKey);

        var fillData = function (key) {
            var summary = renderSection(listOfAlerts[key].alerts, key, listOfAlerts[key].color, 'VIOLATIONS');
            pieData.push(summary);
        };

        if (sortKey === 'level') {
            var unknownLevels = Object.keys(listOfAlerts);
            Object.keys(colorPalette.SeverityTones).forEach(function (key) {
                if (listOfAlerts[key]) {
                    fillData(key);
                    unknownLevels.splice(unknownLevels.indexOf(key), 1);
                    return;
                }
                pieData.push({ label: key, value: 0, color: colorPalette.SeverityTones[key] });
            });
            unknownLevels.forEach(function (key) {
                fillData(key);
            });

        } else {
            Object.keys(listOfAlerts).forEach(function (key) {
                fillData(key);
            });
        }

        if (totalViolations) {
            var endOfViolationsMsg = '<div class="violation-divider"><div class="text">end of violations</div></div>';
            $(containers.mainDataContainerSelector).append(endOfViolationsMsg);
            pie.drawPie(pieData);
        }

        return listOfAlerts;
    }

    function showNoAuditResourcesMessage() {
        $(containers.noAuditResourcesMessageSelector).removeClass('hidden');
        $(containers.mainCont).addClass('empty');
        alerts = undefined;
    }

    function fillViolationsList(violations, reports) {
        if (!Object.keys(violations).length && !Object.keys(disabledViolations).length && !Object.keys(passedViolations).length) {
            showNoAuditResourcesMessage();
            return;
        }
        var totalChecks = 0;
        totalViolations = 0;

        reports.forEach(function (reportData) {
            var report = JSON.parse(reportData.outputs.report);
            totalChecks += reportData.outputs.number_checks;
            var timestamp = utils.formatDate(reportData.timestamp);

            Object.keys(report).forEach(function (region) {
                Object.keys(report[region]).forEach(function (resId) {
                    Object.keys(report[region][resId].violations).forEach(function (violationKey) {
                        var rowData = report[region][resId].violations[violationKey];
                        if (rowData.level === 'Internal') return;

                        if (violations[violationKey]) {
                            rowData.violationId = violations[violationKey]._id;
                            rowData.service = violations[violationKey].inputs.service;
                        }

                        if (typeof rowData.include_violations_in_count === 'undefined') {
                            rowData.include_violations_in_count = true;
                        }

                        var isSuppressed = rowData.suppressed || checkIfResourceIsSuppressed(rowData.suppression_until);
                        var resource = {
                            id: resId,
                            tags: report[region][resId].tags,
                            region: region,
                            isSuppressed: isSuppressed,
                            expiresAt: rowData.suppression_until,
                            reportId: reportData._id
                        };
                        var alert = {
                            title: rowData.display_name || violationKey,
                            id: violationKey,
                            level: rowData.level,
                            category: rowData.category,
                            description: rowData.description,
                            fix: rowData.suggested_action,
                            resource: resource,
                            service: rowData.service,
                            region: rowData.region,
                            link: rowData.link,
                            violationId: rowData.violationId,
                            isViolation: rowData.include_violations_in_count,
                            timestamp: timestamp
                        };
                        alerts.push(alert);

                        if (!alertData.level.hasOwnProperty(alert.level)) {
                            alertData.level[alert.level] = 0;
                        }
                        if (!alertData.category.hasOwnProperty(alert.category)) {
                            alertData.category[alert.category] = 0;
                        }
                        if (!alertData.region.hasOwnProperty(alert.region)) {
                            alertData.region[alert.region] = 0;
                        }
                        if (!alertData.service.hasOwnProperty(alert.service)) {
                            alertData.service[alert.service] = 0;
                        }
                        ++alertData.level[alert.level];
                        ++alertData.category[alert.category];
                        ++alertData.region[alert.region];
                        ++alertData.service[alert.service];

                        if (alert.isViolation && !isSuppressed) ++totalViolations;
                        if (disabledViolations[violationKey]) delete disabledViolations[violationKey];
                    });
                });
            });
        });

        $('.additional-info .checks').html(totalChecks + ' Checks');
    }

    function fillPassedViolationsList(enabledDefinitions) {
        enabledDefinitions.forEach(function (key) {
            if (!disabledViolations[key]) return;
            passedViolations[key] = disabledViolations[key];
            delete disabledViolations[key];
        });
    }

    function fillHtmlSummaryData() {
        $('.pie-data-header .num').html(totalViolations);
        $('.additional-info .passed').html((errors.length) ? ' Passed' : Object.keys(passedViolations).length + ' Passed');
        $('.additional-info .disabled').html(Object.keys(disabledViolations).length + ' Disabled');
    }

    function initResourcesList(ccthisData) {
        var data = ccthisData.resourcesArray;
        var newData = {};
        var reports = [];
        var enabledDefinitions = [];
        errors = [];
        hasOld = false;

        data.forEach(function (elem) {
            if (elem.runId !== ccthisData.runId) hasOld = true;
            if (elem.dataType !== 'ADVISOR_RESOURCE') return;
            var newObj = {};
            newObj.resourceType = elem.resourceType;
            newObj.resourceName = elem.resourceName;
            newObj.dataType = elem.dataType;
            newObj.resourceId = elem.resourceId;
            newObj.namespace = elem.namespace;
            newObj.runId = elem.runId;
            newObj.stackName = elem.stackName;
            newObj.timestamp = elem.timestamp;
            newObj.inputs = {};
            newObj.outputs = {};
            newObj._id = elem._id;
            elem.inputs.forEach(function (input) {
                newObj.inputs[input.name] = input.value;
            });
            elem.outputs.forEach(function (output) {
                newObj.outputs[output.name] = output.value;
            });

            if (newObj.inputs.level === 'Internal') return;
            if (newObj.outputs.error) {
                newObj.rawInputs = elem.inputs;
                newObj.rawOutputs = elem.outputs;
                errors.push(newObj);
            }
            else if (newObj.outputs.report) {
                reports.push(newObj);
                enabledDefinitions = enabledDefinitions.concat(newObj.inputs.alerts);
            }
            else {
                newData[newObj.resourceName] = newObj;
                disabledViolations[newObj.resourceName] = organizeDataForAdditionalSections(newObj);
            }
        });

        fillViolationsList(newData, reports);
        fillPassedViolationsList(enabledDefinitions);
    }

    function scrollToElement(element) {
        var tabsHeight = $('.options-container').height();
        $('.scrollable-area').animate({
            scrollTop: element.offset().top - tabsHeight
        }, 200);
    }

    function setupHandlers() {
        $('.audit .chosen-sorting').change(function () {
            render($(this).val());
        });

        $('.audit .dropdown-button').click(function () {
            $('.audit .custom-dropdown ul').toggleClass('hidden');
        });

        $('.audit .custom-dropdown li').click(function () {
            var chosenSort = $(this).data('value');
            if (chosenSort) {
                var dropdownElem = $(this).closest('.custom-dropdown');
                var sortByElem = dropdownElem.find('.chosen-item-value');
                var isReverseElem = dropdownElem.find('.chosen-item-is-reverse');
                var isReverseVal = isReverseElem.val() === 'true';

                if (sortByElem.val() === chosenSort) {
                    isReverseElem.val(!isReverseVal).trigger('change');
                }
                else {
                    isReverseElem.val(false);
                }
                sortByElem.val(chosenSort).trigger('change');
                dropdownElem.find('.chosen-item-text').html($(this).html());
            }
            $(this).parent().addClass('hidden');
        });

        $(document).click(function (e) {
            if ($(e.target).closest('.audit .custom-dropdown').length === 0) {
                $('.audit .custom-dropdown ul').addClass('hidden');
            }
        });

        $('.browse-composites').click(function () {
            openPopup('redirectToCommunityComposites');
        });
        $('.link.passed-disabled-link').click(function () {
            var passedLink = $('.Passed');
            var disabledLink = $('.Disabled');

            if (passedLink.length > 0) {
                scrollToElement(passedLink);
            } else if (disabledLink.length > 0) {
                scrollToElement(disabledLink);
            }
        });
    }

    function render(sortKey) {
        pie = new ResourcesPie(containers.pieChartSelector);
        var listOfAlerts = renderResourcesList(sortKey);
        renderSection(passedViolations, 'Passed', colorPalette.Passed, 'PASSED');
        renderSection(disabledViolations, 'Disabled', null, 'DISABLED');
        refreshClickHandlers(listOfAlerts);
    }

    function initGlobalVariables() {
        passedViolations = [];
        disabledViolations = [];
        errors = [];
        alerts = [];
        alertData = {
            level: {},
            category: {},
            region: {},
            service: {}
        };
    }

    function initView() {
        $(containers.warningBlock).addClass('hidden');
        $(containers.mainDataContainerSelector).html('');
        $(containers.noAuditResourcesMessageSelector).addClass('hidden');
        $(containers.noViolationsMessageSelector).addClass('hidden');
        $(containers.planIsExecuting).addClass('hidden');
        $(containers.mainCont).removeClass('empty');
    }

    function init(data, sortKey) {
        initGlobalVariables();
        initView();
        initResourcesList(data);

        executionIsFinished = data.engineState === 'COMPLETED' ||
            data.engineState === 'INITIALIZED' ||
            (data.engineState === 'PLANNED' && data.engineStatus !== 'OK');

        if (!executionIsFinished && !hasOld && data.resourcesArray.length < data.numberOfResources) {
            showResourcesAreBeingLoadedMessage();
            return;
        }

        render(sortKey);
        fillHtmlSummaryData();
    }

    function audit(data, sortKey, _callback, selectors) {
        if (selectors) {
            containers = selectors;
        }
        callback = _callback;
        init(data, sortKey);
        setupHandlers();
    }

    audit.prototype.refreshData = function (data) {
        if (data.engineState !== 'COMPLETED') return;
        init(data, $('.audit .chosen-sorting').val());
    };

    audit.prototype.renderResourcesList = render;
    audit.prototype.getViolationsList = function () {
        return alerts;
    };
    audit.prototype.getViolationsCount = function () {
        return totalViolations;
    };
    audit.prototype.getColors = function () {
        return color;
    };
    return audit;
}());
