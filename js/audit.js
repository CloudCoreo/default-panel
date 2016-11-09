window.Audit = (function () {
    var callback;
    var passedViolations = [];
    var disabledViolations = [];
    var alerts = [];
    var alertData = {
        level: {},
        category: {},
        region: {},
        service: {}
    };
    var color = {
        SeverityTones : {
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
        PurpleTones: d3.scaleOrdinal(['#582a7f', '#bf4a95', '#c4c4c4', '#6b6b6b', '#272e39']),
        CoolTones: d3.scaleOrdinal(['#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39']),
        RainbowTones: d3.scaleOrdinal(['#582a7f', '#bf4a95', '#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'])
    };

    var containers = {
        mainDataContainerSelector: '.list',
        noAuditResourcesMessageSelector: '#no-violation-resources',
        noViolationsMessageSelector: '#no-violations-view',
        pieChartSelector: '.pie',
        errorsContSelector: '#advisor-errors',
        mainCont: '.audit-list'
    };

    var pie;
    var headerTpl = $.templates("#list-header-tmpl"),
        violationTpl = $.templates("#row-tmpl"),
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
        if (body.hasClass('hidden')) {
            body.removeClass('hidden');
            body.slideDown()
            _this.html("- hide details");
        } else {
            body.slideUp(function () {
                body.addClass('hidden');
            });
            _this.html("+ view details");
        }
    }

    function refreshClickHandlers(listOfAlerts) {
        $('.resources-link').click(function () {
            var _this = $(this);
            var violationId = _this.attr('violation');
            var sortKey = _this.attr('sortKey');
            var reportId = _this.attr('reportId');

            var params = {
                violationId: _this.attr('violationId'),
                resources: listOfAlerts[sortKey].alerts[violationId].resources,
                color: listOfAlerts[sortKey].color};

            openPopup('showViolationResources', params);
        });
        $('.more-info-link').click(function () {
            openPopup('showViolationMoreInfo', $(this).attr('violation'));
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

    function organizeDataForCurrentRender(sortKey) {
        var keys = Object.keys(alertData[sortKey]);
        var listOfAlerts = {};
        alerts.forEach(function (alert) {
            var key = alert[sortKey];
            if (!listOfAlerts[key]) {
                listOfAlerts[key] = {};
                listOfAlerts[key].alerts = {};
                if(sortKey === 'level') listOfAlerts[key].color = color.SeverityTones[key];
                if (!listOfAlerts[key].color) {
                    var index = keys.indexOf(key);
                    listOfAlerts[key].color = (keys.length > 6) ? color.RainbowTones(index) :
                        (keys.length == 6) ? color.CoolTones(index) : color.PurpleTones(index);
                }
            }

            if (!listOfAlerts[key].alerts[alert.id]) {
                listOfAlerts[key].alerts[alert.id] = alert;
                listOfAlerts[key].alerts[alert.id].sortKey = key;
                listOfAlerts[key].alerts[alert.id].resources = [];
            }
            listOfAlerts[key].alerts[alert.id].resources.push(alert.resource);
        });

        return listOfAlerts;
    }

    function renderErrorsPanel(errors) {
        if (!errors.length) return;

        var errorsList = '';
        errors.forEach(function(error) {
            error.timestamp = utils.formatDate(error.timestamp);
            errorsList += errorTpl.render(error);
        });

        var html =
            '<div class="bg-white layout-padding flex-column layout-margin-bottom-20 md-shadow">' +
                '<div class="subheader flex-grow">Error</div>'+
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
            resources:[]
        };
    }

    function renderSection(violations, key, color) {
        var sectionSummary = {label: key, value: Object.keys(violations).length, color: color};
        if(!sectionSummary.value) {
            return;
        }

        var visibleList = '';
        var restList = '';
        var visibleCount = 0;
        var headerData = {name: sectionSummary.label, resultsCount: sectionSummary.value};
        var header = headerTpl.render(headerData);

        Object.keys(violations).forEach(function (vId) {
            var rendered = violationTpl.render(violations[vId]);
            if (visibleCount < 5) visibleList += rendered;
            else restList += rendered;
            visibleCount++;
        });

        var html =
            '<div class="' + headerData.name + ' bg-white layout-padding" style="margin-bottom: 20px;">' +
                header +
                '<div style="border-color: ' + sectionSummary.color + '">' +
                    visibleList +
                    '<div class="hidden" style="border-color: inherit;">' + restList + '</div>' +
                    ((visibleCount > 5) ? showAllBtnTpl : '') +
                '</div>' +
            '</div>';


        $(containers.mainDataContainerSelector).append(html);
        return sectionSummary;
    }

    function renderResourcesList(sortKey) {
        if (!alerts) {
            return;
        }
        if (!alerts.length && !disabledViolations.length) {
            $(containers.noViolationsMessageSelector).removeClass('hidden');
            return;
        }

        var pieData = [];
        var listOfAlerts = organizeDataForCurrentRender(sortKey);
        $(containers.mainDataContainerSelector).html('');

        if (sortKey === 'level') {
            Object.keys(color.SeverityTones).forEach(function (key) {
                if(listOfAlerts[key]) {
                    renderSection(listOfAlerts[key].alerts, key, listOfAlerts[key].color);
                    pieData.push({label: key, value: Object.keys(listOfAlerts[key].alerts).length, color: listOfAlerts[key].color});
                    return;
                }
                pieData.push({label: key, value: 0, color: color.SeverityTones[key]});
            });
        } else {
            Object.keys(listOfAlerts).forEach(function (key) {
                renderSection(listOfAlerts[key].alerts, key, listOfAlerts[key].color);
                pieData.push({label: key, value: Object.keys(listOfAlerts[key].alerts).length, color: listOfAlerts[key].color});
            });
        }

        pie.drawPie(pieData);
        return listOfAlerts;
    }

    function fillViolationsList(violations, reports) {
        if(!Object.keys(violations).length &&
            !Object.keys(disabledViolations).length &&
            !Object.keys(passedViolations).length) {
            $(containers.noAuditResourcesMessageSelector).removeClass('hidden');
            $(containers.mainCont).addClass('empty');
            alerts = undefined;
            return;
        }
        var totalChecks = 0;

        reports.forEach(function (reportData) {
            var report = JSON.parse(reportData.outputs.report);
            var reportId = reportData._id;
            totalChecks += reportData.outputs.number_checks;

            Object.keys(report).forEach(function (resId) {
                Object.keys(report[resId].violations).forEach(function (violationKey) {
                    var rowData = report[resId].violations[violationKey];
                    var alert = {
                        title: rowData.display_name || violationKey,
                        id: violationKey,
                        level: rowData.level,
                        category: rowData.category,
                        description: rowData.description,
                        fix: rowData.suggested_action,
                        service: violations[violationKey].inputs.service,
                        resource: { id: resId, tags: report[resId].tags },
                        region: rowData.region,
                        link: rowData.link,
                        reportId: reportId,
                        violationId: violations[violationKey]._id
                    };
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

                    alerts.push(alert);
                });
            });
        });

        $('.additional-info .checks').html(totalChecks + ' Checks' );
        $('.additional-info .passed').html(Object.keys(passedViolations).length + ' Passed');
        $('.additional-info .disabled').html(Object.keys(disabledViolations).length + ' Disabled');
    }

    function initResourcesList(data) {
        var newData = {};
        var reports = [];
        var errors = [];
        data.forEach(function (elem) {
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

            if (newObj.outputs.error){
                newObj.rawInputs = elem.inputs;
                newObj.rawOutputs = elem.outputs;
                errors.push(newObj);
            }
            else if (newObj.outputs.report) reports.push(newObj);
            else if(!newObj.outputs.included) disabledViolations[newObj.resourceName] = organizeDataForAdditionalSections(newObj);
            else if(!newObj.outputs.violations) passedViolations[newObj.resourceName] = organizeDataForAdditionalSections(newObj);
            else newData[newObj.resourceName] = newObj;
        });

        fillViolationsList(newData, reports);
        // renderErrorsPanel(errors);
    }

    function setupHandlers() {
        $('#chosen-sorting').change(function () {
            render($(this).val());
        });

        $('.dropdown-button').click(function () {
            $('.custom-dropdown ul').toggleClass('hidden');
        });

        $('.custom-dropdown li').click(function () {
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
            if ($(e.target).closest('.custom-dropdown').length === 0) {
                $('.custom-dropdown ul').addClass('hidden');
            }
        });

        $('.browse-compostites').click(function () {
            openPopup('redirectToCommunityComposites');
        })
    }

    function render(sortKey) {
        var listOfAlerts = renderResourcesList(sortKey);

        if(sortKey === 'level') {
            renderSection(passedViolations, 'Passed Violation Check', color.Passed);
        }
        renderSection(disabledViolations, 'Disabled', color.Disabled);
        refreshClickHandlers(listOfAlerts);
    }

    function init(data, sortKey) {
        pie = new ResourcesPie(containers.pieChartSelector);
        setupHandlers();
        initResourcesList(data);
        render(sortKey);
    }

    function audit(data, sortKey, _callback, selectors) {
        if(selectors) {
            containers = selectors;
        }
        callback = _callback;
        init(data, sortKey);
    }

    audit.prototype.renderResourcesList = render;
    audit.prototype.getViolationsList = function () {
        return alerts;
    };
    audit.prototype.getColors = function () {
        return color;
    };
    return audit;
}());
