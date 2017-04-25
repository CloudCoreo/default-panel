window.Audit = (function (Resource, AuditRender) {
    var errorCallback;
    var totalViolations = 0;
    var passedViolations = [];
    var disabledViolations = [];
    var alerts = [];
    var alertData = new AlertData();
    var executionIsFinished;
    var errors = [];
    var hasOld = false;
    var auditRender;

    var colorPalette = constans.COLORS;
    var containers = constans.CONTAINERS;



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

        var colorsRange = AuditUtils.getColorRangeByKeys(keys, colorPalette);
        var colors = d3.scaleOrdinal(colorsRange);

        var suppressedViolations = {};

        alerts.forEach(function (alert) {
            var key = alert[sortKey];
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
        sendRequest(constans.REQUEST.GET_TRUNCATED_OBJ,
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

                    var isSuppressed = rowData.suppressed || AuditUtils.checkIfResourceIsSuppressed(rowData.suppression_until);
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
                    if (disabledViolations[violationKey]) delete disabledViolations[violationKey];
                });
            });
        });
    }

    function fillViolationsList(violations, reports, callback) {
        if (!Object.keys(violations).length && !Object.keys(disabledViolations).length && !Object.keys(passedViolations).length) {
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

            var resource = new Resource(elem);

            elem.inputs.forEach(function (input) {
                resource.inputs[input.name] = input.value;
            });
            elem.outputs.forEach(function (output) {
                resource.outputs[output.name] = output.value;
            });

            if (resource.inputs.level === 'Internal') return;
            if (resource.outputs.error) {
                resource.rawInputs = elem.inputs;
                resource.rawOutputs = elem.outputs;
                errors.push(resource);
            }
            else if (resource.outputs.report) {
                reports.push(resource);
                if(resource.inputs.rules){
                    enabledDefinitions = enabledDefinitions.concat(JSON.parse(resource.inputs.rules));
                } else if (resource.inputs.alerts){
                    if(resource.inputs.alerts instanceof Object){
                        enabledDefinitions = enabledDefinitions.concat(resource.inputs.alerts);
                    } else {
                        enabledDefinitions = enabledDefinitions.concat(JSON.parse(resource.inputs.alerts));
                    }

                }
            }
            else {
                rules[resource.resourceName] = resource;
                disabledViolations[resource.resourceName] = AuditUtils.organizeDataForAdditionalSections(resource);
            }
        });

        fillViolationsList(rules, reports, function () {
            fillPassedViolationsList(enabledDefinitions);
            callback();
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
            openPopup(constans.POPUPS.REDIRECT_TO_COMPOSITES);
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

    function reRender(sortKey, isDisabledSectionVisible) {
        var listOfAlerts = organizeDataForCurrentRender(sortKey);

        if (!alerts || !alerts.length) return;
        if (!alerts.length && !disabledViolations.length && !errors.length) {
            showEmptyViolationsMessage();
            return;
        }

        auditRender.render(listOfAlerts, sortKey);

        if (totalViolations) {
            auditRender.renderViolationDivider(sortKey);
        }

        auditRender.renderSection(passedViolations, 'No violation', colorPalette.Passed, 'PASSED', sortKey);
        if (isDisabledSectionVisible) {
            auditRender.renderSection(disabledViolations, 'No violation', null, 'DISABLED', sortKey);
        }

        AuditUI.refreshClickHandlers(listOfAlerts, passedViolations);
    }

    function initGlobalVariables() {
        passedViolations = [];
        disabledViolations = [];
        errors = [];
        alerts = [];
        alertData = new AlertData;
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

        auditRender = new AuditRender(sortKey);

        if (data.engineStatus == "EXECUTION_ERROR") {
            $(containers.warningBlock).removeClass('hidden');
        }

        executionIsFinished = data.engineState === constans.ENGINE_STATES.COMPLETED ||
            data.engineState === constans.ENGINE_STATES.INITIALIZED ||
            (data.engineState === constans.ENGINE_STATES.PLANNED && data.engineStatus !== constans.ENGINE_STATUSES.OK);

        initResourcesList(data, function () {
            if (!executionIsFinished && !hasOld) {
                AuditUI.showResourcesAreBeingLoadedMessage();
                return;
            }
            var isDisabledSectionVisible = !data.globalData || !data.globalData.variables.disable_disabled_card_processing;
            var isError = errors.length === 0;
            var passedNum = Object.keys(passedViolations).length;
            var disabledNum = Object.keys(disabledViolations).length;

            AuditUI.fillHtmlSummaryData(isError, passedNum, disabledNum);
            reRender(sortKey, isDisabledSectionVisible);
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
        if (data.engineState !== constans.ENGINE_STATES.COMPLETED) return;
        init(data, $('.audit .chosen-sorting').val(), callback);
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
