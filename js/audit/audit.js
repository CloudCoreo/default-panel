window.Audit = (function (Resource, AuditRender) {
    var errorCallback;
    var totalViolations = 0;
    var noViolations = [];
    var alerts = [];
    var alertData = new AlertData();
    var executionIsFinished;
    var errors = [];
    var hasOld = false;
    var auditRender;
    var isDisabledViolationsVisible;
    var ccThisData = {};

    var colorPalette = constants.COLORS;
    var containers = constants.CONTAINERS;


    function removeTotallySuppressedViolations(listOfAlerts, suppressedViolations) {
        Object.keys(suppressedViolations).forEach(function (alertId) {
            delete noViolations[alertId];
            Object.keys(suppressedViolations[alertId]).forEach(function (key) {
                if (suppressedViolations[alertId][key]) {
                    if (!noViolations[alertId]) {
                        noViolations[alertId] = listOfAlerts[key].alerts[alertId];
                    }
                    else {
                        noViolations[alertId].suppressions = noViolations[alertId].suppressions.concat(listOfAlerts[key].alerts[alertId].suppressions);
                    }

                    delete listOfAlerts[key].alerts[alertId];
                }
            });
        });
        return listOfAlerts;
    }


    function organizeForSorting(sortKey) {
        var keys = [sortKey];
        var listOfAlerts = organizeDataForCurrentRender(sortKey, keys, constants.ORGANIZIATION_TYPE.SORT);

        if (Object.keys(listOfAlerts).length === 0) {
            listOfAlerts[sortKey] = {};
            listOfAlerts[sortKey].alerts = {};
            listOfAlerts[sortKey].color = colorPalette.Disabled;
        }
        Object.keys(noViolations).forEach(function (violationKey) {
            listOfAlerts[sortKey].alerts[violationKey] = noViolations[violationKey];
        });

        listOfAlerts[sortKey].alerts = utils.sortHashOfObjectsByField(listOfAlerts[sortKey].alerts, sortKey);

        return listOfAlerts;
    }


    function organizeForGrouping(sortKey) {
        var keys = Object.keys(alertData[sortKey]);
        return organizeDataForCurrentRender(sortKey, keys, constants.ORGANIZIATION_TYPE.GROUP);
    }


    function organizeDataForCurrentRender(sortKey, keys, organizeType) {
        var listOfAlerts = {};

        var colorsRange = AuditUtils.getColorRangeByKeys(keys, colorPalette);
        var colors = d3.scaleOrdinal(colorsRange);

        var suppressedViolations = {};

        alerts.forEach(function (alert) {
            var key = organizeType === constants.ORGANIZIATION_TYPE.GROUP ? alert[sortKey] : sortKey;
            if (!listOfAlerts[key]) {
                listOfAlerts[key] = {};
                listOfAlerts[key].alerts = {};
                listOfAlerts[key].color = AuditUtils.getColor(alert, sortKey, keys, colors, colorPalette);
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


    function showEmptyViolationsMessage() {
        if (executionIsFinished) {
            AuditUI.showNoViolationsMessage();
            auditRender.renderAllClearPie(noViolations);
            auditRender.setChartHeaderText(uiTexts.CHART_HEADER.RULES);
            return;
        }
        AuditUI.showResourcesAreBeingLoadedMessage();
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

        sendRequest(constants.REQUEST.GET_TRUNCATED_OBJ,
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
                    if (rowData.level === constants.VIOLATION_LEVELS.INTERNAL) return;

                    if (violations[violationKey]) {
                        rowData.violationId = violations[violationKey]._id;
                        rowData.service = violations[violationKey].inputs.service;
                        rowData.meta_cis_id = violations[violationKey].inputs.meta_cis_id;
                    }

                    if (typeof rowData.include_violations_in_count === 'undefined') {
                        rowData.include_violations_in_count = true;
                    }

                    var isSuppressed = rowData.suppressed || AuditUtils.checkIfResourceIsSuppressed(rowData.suppression_until);
                    var resource = {
                        id: resId,
                        tags: report[region][resId].tags || [],
                        region: region,
                        isSuppressed: isSuppressed,
                        expiresAt: rowData.suppression_until,
                        reportId: reportId
                    };

                    var alert = new Violation(rowData);

                    alert.title = rowData.display_name || violationKey;
                    alert.id = violationKey;
                    alert.resource = resource;
                    alert.timestamp = timestamp;
                    alert.metas = AuditUtils.getRuleMetasCis(rowData);
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
                    if (noViolations[violationKey]) delete noViolations[violationKey];
                });
            });
        });
    }


    function fillViolationsList(violations, reports, callback) {
        if (!Object.keys(violations).length) {
            AuditUI.showNoAuditResourcesMessage();
            alerts = undefined;
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


    function setPassedStatus(enabledDefinitions) {
        enabledDefinitions.forEach(function (key) {
            if (!noViolations[key]) return;
            if (noViolations[key].meta_always_show_card) {
                alerts.push(noViolations[key]);
            } else {
                noViolations[key].isPassed = true;
            }
        });
    }


    function reduceObject(accumulator, current) {
        accumulator[current.name] = current.value;
        return accumulator;
    }


    function initResourcesList(resources, sortKey, callback) {
        var rules = {};
        var reports = [];
        var enabledDefinitions = [];
        errors = [];
        hasOld = false;

        resources.forEach(function (resource) {
            if (resource.runId !== ccThisData.runId) hasOld = true;
            if (resource.dataType !== constants.RESOURCE_TYPE.ADVISOR_RESOURCE) return;

            var isRuleRunner = resource.resourceType.indexOf('coreo_aws_rule_runner') !== -1;


            if (resource.inputs.level === constants.VIOLATION_LEVELS.INTERNAL) return;
            if (resource.outputs.error) {
                errors.push(resource);
            }
            else if (isRuleRunner && resource.outputs.report) {
                reports.push(resource);

                if (!resource.inputs.rules) return;
                if (typeof resource.inputs.rules === 'string') {
                    enabledDefinitions = enabledDefinitions.concat(JSON.parse(resource.inputs.rules));
                } else {
                    enabledDefinitions = enabledDefinitions.concat(resource.inputs.rules);
                }
            }
            else {
                rules[resource.resourceName] = resource;
                noViolations[resource.resourceName] = AuditUtils.organizeDataForAdditionalSections(resource);
            }
        });

        fillViolationsList(rules, reports, function () {
            setPassedStatus(enabledDefinitions);
            callback(sortKey);
        });
    }


    function setupHandlers() {
        $('.audit .chosen-sorting').change(function () {
            reRender($(this).val());
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
            openPopup(constants.POPUPS.REDIRECT_TO_COMPOSITES);
        });
        $('.link.passed-disabled-link').click(function () {
            var passedLink = $('.Passed');
            var disabledLink = $('.Disabled');

            if (passedLink.length > 0) {
                AuditUI.scrollToElement(passedLink);
            } else if (disabledLink.length > 0) {
                AuditUI.scrollToElement(disabledLink);
            }
        });
    }

    function renderNoViolationsSection(sortKey) {
        auditRender.renderSection({
            violations: noViolations,
            key: 'No-violations',
            color: colorPalette.Passed,
            resultsType: constants.RESULT_TYPE.RULES,
            sortKey: sortKey,
            isDisabledVisible: isDisabledViolationsVisible
        });
    }

    function renderInformationalSection(sortKey, object) {
        auditRender.renderSection({
            violations: object.alerts,
            key: constants.RESULT_TYPE.INFORMATIONAL,
            color: colorPalette.SeverityTones.Informational,
            resultsType: constants.RESULT_TYPE.INFORMATIONAL,
            sortKey: sortKey
        });
    }

    function renderRules(isSorting, sortKey) {
        var listOfAlerts = {};
        var informational = {};

        if (isSorting) listOfAlerts = organizeForSorting(sortKey);
        else listOfAlerts = organizeForGrouping(sortKey);

        if (listOfAlerts['Informational'] && !isSorting) {
            informational = listOfAlerts['Informational'];
        }

        auditRender.render(listOfAlerts, sortKey);

        if (totalViolations) {
            auditRender.renderViolationDivider(sortKey);
        }
        if (informational && !isSorting && sortKey === 'level') {
            renderInformationalSection(sortKey, informational);
        }
        if (!isSorting) {
            renderNoViolationsSection(sortKey);
        }
        AuditUI.refreshClickHandlers(listOfAlerts, noViolations);
    }

    function reRender(sortKey) {
        if (!alerts) {
            return;
        }
        
        var hasDisabled = false;

        var noEmptyRules = !noViolations || Object.keys(noViolations).length === 0;
        if (!noEmptyRules) {
            Object.keys(noViolations).forEach(function (ruleId) {
                if (!noViolations[ruleId].isPassed) hasDisabled = true;
            });
            hasDisabled = hasDisabled && isDisabledViolationsVisible;
        }

        auditRender.clearContainer();
        var listOfAlerts = {};

        var isSorting = sortKey.indexOf('meta_') !== -1;
        var isClear = !alerts.length && !hasDisabled && !errors.length;

        if (isClear) {
            showEmptyViolationsMessage();
            renderNoViolationsSection(sortKey);
            AuditUI.refreshClickHandlers(listOfAlerts, noViolations);
            return;
        }

        renderRules(isSorting, sortKey);
    }


    function getRulesForRunnerResource(isRuleRunner, rules, callback) {

        if (!isRuleRunner) {
            callback(rules);
            return;
        }

        if (typeof rules === 'string') rules = JSON.parse(rules);

        if (!rules.truncated) {
            callback(rules);
            return;
        }

        sendRequest(constants.REQUEST.GET_TRUNCATED_OBJ, {
                objectKey: rules.truncated.object_key,
                blockUI: false
            },
            function (error, retrievedObject) {
                if (error) {
                    rules = [];
                }
                else {
                    rules = retrievedObject;
                }
                callback(rules);
            });
    }


    function fillTruncatedRules(resources, callback, initRender, sortKey) {

        var handledRulesCount = 0;
        var changedResources = [];

        resources.forEach(function (item) {

            var resource = new Resource(item);
            var isRuleRunner = resource.resourceType.indexOf('coreo_aws_rule_runner') !== -1;

            resource.inputs = item.inputs.reduce(reduceObject, {});
            resource.outputs = item.outputs.reduce(reduceObject, {});

            changedResources.push(resource);

            getRulesForRunnerResource(isRuleRunner, resource.inputs.rules, function (rules) {
                ++handledRulesCount;

                if (isRuleRunner) {
                    resource.inputs.rules = rules;
                }
                if (handledRulesCount === resources.length) {
                    callback(changedResources, sortKey, initRender);
                }
            });
        });
    }


    function initGlobalVariables() {
        noViolations = {};
        errors = [];
        alerts = [];
        alertData = new AlertData();
    }


    function init(sortKey, callback) {
        var resources = ccThisData.resourcesArray;

        initGlobalVariables();
        AuditUI.initView();

        isDisabledViolationsVisible = !ccThisData.globalData || !ccThisData.globalData.variables.disable_disabled_card_processing;

        auditRender = new AuditRender(sortKey, isDisabledViolationsVisible);

        if (ccThisData.engineStatus === constants.ENGINE_STATUSES.EXECUTION_ERROR) {
            $(containers.warningBlock).removeClass('hidden');
        }

        var initRender = function (sortKey) {

            var isCompleted = ccThisData.engineState === constants.ENGINE_STATES.COMPLETED;
            var isInitialized = ccThisData.engineState === constants.ENGINE_STATES.INITIALIZED;
            var isPlanned = ccThisData.engineState === constants.ENGINE_STATES.PLANNED;
            var isStatusOK = ccThisData.engineState === constants.ENGINE_STATUSES.OK;

            executionIsFinished = isCompleted || isInitialized || (isPlanned && !isStatusOK);

            if (!executionIsFinished && !hasOld) {
                AuditUI.showResourcesAreBeingLoadedMessage();
                return;
            }
            if (alerts) {
                reRender(sortKey);
            }
            callback();
        };

        fillTruncatedRules(resources, initResourcesList, initRender, sortKey);
    }


    function audit(data, sortKey, callback, _errorCallback) {
        ccThisData = data;
        errorCallback = _errorCallback;
        setTimeout(function () {
            init(sortKey, function () {
                setupHandlers();
                callback();
            });
        });
    }


    audit.prototype.refreshData = function (data, callback) {
        ccThisData = data;
        if (data.engineState !== constants.ENGINE_STATES.COMPLETED) return;
        init($('.audit .chosen-sorting').val(), callback);
    };

    audit.prototype.renderResourcesList = render;
    audit.prototype.getViolationsList = function () {
        return alerts;
    };
    audit.prototype.getViolationsCount = function () {
        return totalViolations;
    };
    return audit;
}(Resource, AuditRender));
