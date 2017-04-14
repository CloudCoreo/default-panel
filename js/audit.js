window.Audit = (function () {
    var errorCallback;
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
            High: '#E53E2B',
            Medium: '#E49530',
            Low: '#EAC907',
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

    function getOrganizedViolationData(_this, listOfAlerts) {
        var violationId = _this.attr('violation');
        var sortKey = _this.attr('sortKey');

        var params = {
            violationId: _this.attr('violationId'),
            resources: listOfAlerts[sortKey].alerts[violationId].resources,
            suppressions: listOfAlerts[sortKey].alerts[violationId].suppressions,
            color: listOfAlerts[sortKey].color
        };

        return params;
    }

    function refreshClickHandlers(listOfAlerts) {
        $('.resources-link, .resources-title-link').click(function () {
            var _this = $(this);
            var params = getOrganizedViolationData(_this, listOfAlerts);
            openPopup('showViolationResources', params);
        });

        $('.share-link').click(function () {
            var _this = $(this);
            var params = getOrganizedViolationData(_this, listOfAlerts);
            openPopup('shareViolation', params);
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

    function checkIfResourceIsSuppressed(date) {
        if (date === undefined) return false;

        var now = new Date();

        if (date.length) {
            var suppressedDate = new Date(date);
            return suppressedDate.getTime() >= now.getTime();
        }

        return false;
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

            if (!alert.resource) return;
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

    function getRuleMetasCis(ruleInputs) {
        var metas = [];
        Object.keys(ruleInputs).forEach(function (key) {
            if (key !== 'meta_cis_id' && -1 !== key.indexOf('meta_cis')) {
                var metaTitle = key.replace('meta_', '').replace('_', ' ');
                metas.push({ key: metaTitle, value: ruleInputs[key] });
            }
        });
        return metas;
    }

    function organizeDataForAdditionalSections(violation) {
        var data = violation.inputs;
        data.title = violation.inputs.display_name || violation.resourceName;
        data.id = violation.resourceName;
        data.resources = [];
        data.suppressions = [];
        data.violationId = violation._id;
        data.metas = getRuleMetasCis(violation.inputs);

        return data;
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
                violation: violations[vId],
                isViolation: !isPassedOrDisabled && violations[vId].resources.length > 0
            };

            rendered = violationTpl.render(options);

            if (visibleCount < 5) {
                visibleList += rendered;
            } else {
                restList += rendered;
            }
            visibleCount++;

            sectionSummary.value += violations[vId].resources.length;
            if (violations[vId].include_violations_in_count) violationsCount += 1;
        });

        var html =
                '<div class="' + (isPassedOrDisabled ? 'bg-light-grey' : 'bg-white') + '" style="border-color: ' + (isPassedOrDisabled ? 'grey' : sectionSummary.color) + '">' +
                visibleList +
                '<div class="hidden" style="border-color: inherit;">' + restList + '</div>' +
                ((visibleCount > 5) ? showAllBtnTpl : '') +
                '</div>';
        $(containers.mainDataContainerSelector).append(html);

        return violationsCount;
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

    function renderPie() {
        var pieData = [];
        var listOfAlerts = organizeDataForCurrentRender('level');
        var fillData = function (key) {
            var summary = { label: key, value: 0, color: listOfAlerts[key].color };
            Object.keys(listOfAlerts[key].alerts).forEach(function (vId) {
                summary.value += listOfAlerts[key].alerts[vId].resources.length;
            });
            pieData.push(summary);
        };

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
        pie.drawPie(pieData);
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

        renderPie();

        var listOfAlerts = organizeDataForCurrentRender(sortKey);
        var violationsCount = 0;

        Object.keys(listOfAlerts).forEach(function (key) {
            violationsCount += renderSection(listOfAlerts[key].alerts, key, listOfAlerts[key].color, 'VIOLATIONS');
        });
        $('.pie-data-header .num').html(violationsCount);
        var headerData = { name: sortKey, resultsCount: violationsCount, resultsType: 'VIOLATIONS' };
        var header = headerTpl.render(headerData);
        var html = '<div class="' + headerData.name + ' layout-padding bg-white' + '" style="margin-bottom: 0px;">' + header + '</div>';

        $(containers.mainDataContainerSelector).prepend(html);

        return listOfAlerts;
    }

    function showNoAuditResourcesMessage() {
        $(containers.noAuditResourcesMessageSelector).removeClass('hidden');
        $(containers.mainCont).addClass('empty');
        alerts = undefined;
    }

    function onError() {
        if (!errorCallback) return;
        errorCallback();
    }

    function getReport(reportData, callback, blockUI) {
        var timestamp = utils.formatDate(reportData.timestamp);
        var report = reportData.outputs.report;
        if (typeof report === 'string') report = JSON.parse(report);

        if (!report.truncated) {
            callback(report, reportData._id, timestamp);
            return;
        }
        sendRequest('getTruncatedObject',
            { objectKey: report.truncated.object_key, blockUI: blockUI },
            function (error, retrievedObject) {
                if (error) {
                    $(".audit-data-is-not-ready").removeClass("hidden");
                    onError();
                    setTimeout(function () {
                        getReport(reportData, callback, false);
                    }, 10000);
                    return;
                }
                $(".audit-data-is-not-ready").addClass("hidden");
                callback(retrievedObject, reportData._id, timestamp);
            });
    }

    function reorganizeReportData(report, reportId, timestamp, violations) {
        Object.keys(report).forEach(function (region) {
            Object.keys(report[region]).forEach(function (resId) {
                Object.keys(report[region][resId].violations).forEach(function (violationKey) {
                    var rowData = report[region][resId].violations[violationKey];
                    if (rowData.level === 'Internal') return;

                    if (violations[violationKey]) {
                        rowData.violationId = violations[violationKey]._id;
                        rowData.service = violations[violationKey].inputs.service;
                        rowData.meta_cis_id = violations[violationKey].inputs.meta_cis_id;
                    }

                    if (typeof rowData.include_violations_in_count === 'undefined') {
                        rowData.include_violations_in_count = true;
                    }

                    var isSuppressed = rowData.suppressed || checkIfResourceIsSuppressed(rowData.suppression_until);
                    var resource = {
                        id: resId,
                        tags: report[region][resId].tags || [],
                        region: region,
                        isSuppressed: isSuppressed,
                        expiresAt: rowData.suppression_until,
                        reportId: reportId
                    };

                    var alert = rowData;
                    alert.title = rowData.display_name || violationKey;
                    alert.id = violationKey;
                    alert.resource = resource;
                    alert.timestamp = timestamp;
                    alert.metas = getRuleMetasCis(rowData);
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
                    if (!alertData.meta_cis_id.hasOwnProperty(alert.meta_cis_id)) {
                        alertData.meta_cis_id[alert.meta_cis_id] = 0;
                    }
                    ++alertData.level[alert.level];
                    ++alertData.category[alert.category];
                    ++alertData.region[alert.region];
                    ++alertData.service[alert.service];
                    ++alertData.meta_cis_id[alert.meta_cis_id];

                    if (alert.include_violations_in_count && !isSuppressed) ++totalViolations;
                    if (disabledViolations[violationKey]) delete disabledViolations[violationKey];
                });
            });
        });
    }

    function fillViolationsList(violations, reports, callback) {
        if (!Object.keys(violations).length && !Object.keys(disabledViolations).length && !Object.keys(passedViolations).length) {
            showNoAuditResourcesMessage();
            callback();
            return;
        }
        var totalChecks = 0;
        totalViolations = 0;

        var handledReports = 0;
        var checkFetchedReport = function (report, reportId, timestamp) {
            ++handledReports;
            reorganizeReportData(report, reportId, timestamp, violations);
            if (handledReports === reports.length) {
                callback();
            }
        };

        reports.forEach(function (reportData) {
            totalChecks += reportData.outputs.number_checks;
            getReport(reportData, checkFetchedReport, true);
        });

        $('.additional-info .checks').html(totalChecks + ' Checks');
    }

    function fillPassedViolationsList(enabledDefinitions) {
        enabledDefinitions.forEach(function (key) {
            if (!disabledViolations[key]) return;
            if (disabledViolations[key].meta_always_show_card) {
                alerts.push(disabledViolations[key]);
            } else {
                passedViolations[key] = disabledViolations[key];
            }
            delete disabledViolations[key];
        });
    }

    function fillHtmlSummaryData() {
        $('.additional-info .passed').html((errors.length) ? ' Passed' : Object.keys(passedViolations).length + ' Passed');
        $('.additional-info .disabled').html(Object.keys(disabledViolations).length + ' Disabled');
    }

    function initResourcesList(ccthisData, callback) {
        var data = ccthisData.resourcesArray;
        var rules = {};
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
                if (newObj.inputs.rules) enabledDefinitions = enabledDefinitions.concat(JSON.parse(newObj.inputs.rules));
            }
            else {
                rules[newObj.resourceName] = newObj;
                disabledViolations[newObj.resourceName] = organizeDataForAdditionalSections(newObj);
            }
        });

        fillViolationsList(rules, reports, function () {
            fillPassedViolationsList(enabledDefinitions);
            callback();
        });
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

    function render(sortKey, isDisabledSectionVisible) {
        pie = new ResourcesPie(containers.pieChartSelector);
        var listOfAlerts = renderResourcesList(sortKey);
        renderSection(passedViolations, 'Passed', colorPalette.Passed, 'PASSED');
        if (isDisabledSectionVisible) {
            renderSection(disabledViolations, 'Disabled', null, 'DISABLED');
        }
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
            service: {},
            meta_cis_id: {}
        };
    }

    function initView() {
        $(containers.mainCont).removeClass('hidden');
        $(containers.warningBlock).addClass('hidden');
        $(containers.mainDataContainerSelector).html('');
        $(containers.noAuditResourcesMessageSelector).addClass('hidden');
        $(containers.noViolationsMessageSelector).addClass('hidden');
        $(containers.planIsExecuting).addClass('hidden');
        $(containers.mainCont).removeClass('empty');
    }

    function init(data, sortKey, callback) {
        initGlobalVariables();
        initView();
        executionIsFinished = data.engineState === 'COMPLETED' ||
            data.engineState === 'INITIALIZED' ||
            (data.engineState === 'PLANNED' && data.engineStatus !== 'OK');

        initResourcesList(data, function () {
            if (!executionIsFinished && !hasOld) {
                showResourcesAreBeingLoadedMessage();
                return;
            }
            var isDisabledSectionVisible = !data.globalData || !data.globalData.variables.disable_disabled_card_processing;
            render(sortKey, isDisabledSectionVisible);
            fillHtmlSummaryData();
            callback();
        });
    }

    function audit(data, sortKey, callback, _errorCallback) {
        errorCallback = _errorCallback
        setTimeout(function () {
            init(data, sortKey, function () {
                setupHandlers();
                callback();
            });
        });
    }

    audit.prototype.refreshData = function (data, callback) {
        if (data.engineState !== 'COMPLETED') return;
        init(data, $('.audit .chosen-sorting').val(), callback);
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
