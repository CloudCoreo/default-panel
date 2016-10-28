window.Audit = (function () {
    var alerts = [];
    var alertData = {
        level: {},
        category: {},
        region: {},
        service: {}
    };
    var color = {
        Emergency: '#770a0a',
        Alert: '#e53e2b',
        Critical: '#e49530',
        Error: '#eac907',
        Warning: '#c4c4c4',
        Notice: '#6b6b6b',
        Informational: '#272e39',
        Debug: '#ffffff',
        PurpleTones: d3.scaleOrdinal(['#582a7f', '#bf4a95', '#c4c4c4', '#6b6b6b', '#272e39']),
        CoolTones: d3.scaleOrdinal(['#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39']),
        RainbowTones: d3.scaleOrdinal(['#582a7f', '#bf4a95', '#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'])
    };

    var pie;
    var headerTpl = $.templates("#list-header-tmpl"),
        violationTpl = $.templates("#row-tmpl"),
        showAllBtnTpl = $("#show-all-btn-tmpl").html();

    function onShowViolationResourcesListClick(elem) {
        var _this = $(elem);
        var violationId = _this.attr('violation');
        var sortKey = _this.attr('sortKey');
        var reportId = _this.attr('reportId');
        redirectToAuditResources(reportId, violationId, JSON.stringify(listOfAlerts[sortKey].alerts[violationId].resources));
    }

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
            onShowViolationResourcesListClick(this)
        });
        $('.more-info-link').click(function () {

        });
        $('.share-link').click(function () {

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
                listOfAlerts[key].color = color[key];
                if (!listOfAlerts[key].color) {
                    var index = keys.indexOf(key);
                    listOfAlerts[key].color = (keys.length > 6) ? color.RainbowTones(index) :
                        (keys.length == 6) ? color.CoolTones(index) : color.PurpleTones(index);
                }
            }

            if (!listOfAlerts[key].alerts[alert.id]) {
                listOfAlerts[key].alerts[alert.id] = alert;
                listOfAlerts[key].alerts[alert.id].resources = [];
            }
            listOfAlerts[key].alerts[alert.id].resources.push(alert.resource);
        });

        return listOfAlerts;
    }

    function renderResourcesList(sortKey) {
        if (!alerts) {
            return;
        }

        if (!alerts.length) {
            $('#no-violations-view').removeClass('hidden');
            return;
        }

        var data = [];
        var listOfAlerts = organizeDataForCurrentRender(sortKey);
        var visibleCount;
        var visibleList;
        var restList;

        $('.list').html('');

        Object.keys(listOfAlerts).forEach(function (key) {
            var currentColor = listOfAlerts[key].color;
            var headerData = {name: key, resultsCount: alertData[sortKey][key]};
            var header = headerTpl.render(headerData);

            data.push({label: headerData.name, value: headerData.resultsCount, color: currentColor});

            visibleList = '';
            restList = '';
            visibleCount = 0;

            var groupedAlerts = listOfAlerts[key];
            Object.keys(groupedAlerts.alerts).forEach(function (alertId) {
                var rendered = violationTpl.render(groupedAlerts.alerts[alertId]);

                if (visibleCount < 5) visibleList += rendered;
                else restList += rendered;
                visibleCount++;
            });

            var html = '<div class="' + key + ' bg-white layout-padding" style="margin-bottom: 20px;">' +
                header +
                '<div style="border-color: ' + currentColor + '">' +
                visibleList +
                '<div class="hidden" style="border-color: inherit;">' + restList + '</div>' +
                ((visibleCount > 5) ? showAllBtnTpl : '') +
                '</div>' +
                '</div>';

            $('.list').append(html);
        });
        pie.drawPie(data);
        refreshClickHandlers(listOfAlerts);
    }

    function fillViolationsList(violations, reports) {
        if(!Object.keys(violations).length) {
            $('#no-violation-resources').removeClass('hidden');
            alerts = undefined;
            return;
        }

        reports.forEach(function (reportData) {
            var report = JSON.parse(reportData.outputs.report);
            var reportId = reportData.resourceName;

            Object.keys(report).forEach(function (resId) {
                Object.keys(report[resId].violations).forEach(function (violationKey) {
                    var rowData = report[resId].violations[violationKey];
                    var alert = {
                        title: rowData.display_name,
                        id: violationKey,
                        level: rowData.level,
                        category: rowData.category,
                        description: rowData.description,
                        fix: rowData.suggested_action,
                        resource: resId,
                        service: violations[violationKey].inputs.service,
                        region: rowData.region,
                        link: rowData.link,
                        reportId: reportId
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
    }

    function initResourcesList(data) {
        var newData = [];
        var reports = [];

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

            newObj.inputs = {};
            newObj.outputs = {};

            elem.inputs.forEach(function (input) {
                newObj.inputs[input.name] = input.value;
            });
            elem.outputs.forEach(function (output) {
                newObj.outputs[output.name] = output.value;
            });

            if (!newObj.outputs.report) newData[newObj.resourceName] = newObj;
            else reports.push(newObj);
        });

        fillViolationsList(newData, reports);
    }

    function init(data, sortKey) {
        pie = new ResourcesPie('.pie');
        initResourcesList(data);
        renderResourcesList(sortKey);
    }

    function audit(data, sortKey) {
        init(data, sortKey);
    }

    audit.prototype.renderResourcesList = renderResourcesList;
    audit.prototype.getViolationsList = function () {
        return alerts;
    };
    audit.prototype.getColors = function () {
        return color;
    };
    return audit;
}());
