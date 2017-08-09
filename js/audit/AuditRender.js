window.AuditRender = (function () {

    var self;

    var containers = Constants.CONTAINERS;
    var colorPalette = Constants.COLORS;
    var templates = Constants.TEMPLATE_IDS;

    var pie = new ResourcesPie(containers.pieChartSelector);

    var headerTpl = $.templates(templates.LIST_HEADER),
        violationTpl = $.templates(templates.VIOLATION_ROW);


    function getCounterLabel(params) {
        var violationCount = params.violationsCount;
        var noViolationCount = params.noViolationCount;
        var isNotPlural = params.violationsCount === 1;

        if (params.isInformational) {
            return violationCount + ' ' + (isNotPlural ? uiTexts.LABELS.CLOUD_OBJECT : uiTexts.LABELS.CLOUD_OBJECTS);
        }
        if (params.isSorting) {
            return noViolationCount + ' ' + (noViolationCount === 1 ? uiTexts.LABELS.RULE : uiTexts.LABELS.RULES) + ', ' +
                violationCount + ' ' + (violationCount === 1 ? uiTexts.LABELS.WITH_VIOLATION : uiTexts.LABELS.WITH_VIOLATIONS);
        }
        if (params.isNoViolation) {
            isNotPlural = noViolationCount === 1;
            return noViolationCount + ' ' + (isNotPlural ? uiTexts.LABELS.RULE : uiTexts.LABELS.RULES);
        }
        return violationCount + ' ' + (isNotPlural ? uiTexts.LABELS.VIOLATING_OBJECT : uiTexts.LABELS.VIOLATING_OBJECTS);
    }

    function getSubHeader(params) {
        return {
            label: AuditUtils.removeMetaPrefix(params.sortKey).replace(/[-_]/g, ' '),
            value: params.violation[params.sortKey] || '-'
        }
    }

    function renderHeader(params) {
        return headerTpl.render({
            name: params.name,
            key: params.key,
            label: getCounterLabel({
                isSorting: params.isSorting,
                isInformational: params.isInformational,
                isNoViolation: params.isNoViolation,
                violationsCount: params.violationsCount,
                noViolationCount: params.noViolationCount
            }),
            isSorting: params.isSorting
        });
    }

    function renderViolationRow(params) {
        return Templates.violationBlock({
            renderOptions: params,
            violationTpl: violationTpl,
            color: params.color
        });
    }

    function renderSection(params) {
        var violationsCopy = utils.objectDeepCopy(params.violations);
        var sectionSummary = {label: params.key, value: 0, color: params.color};
        var isNoViolation = params.resultsType === Constants.RESULT_TYPE.RULES;
        var isInformational = params.resultsType === Constants.RESULT_TYPE.INFORMATIONAL;
        var violationsCount = 0;
        var noViolationCount = 0;
        var allViolationsCount = 0;
        var renderedBlock = '';
        var isSorting = AuditUtils.isSorting(params.sortKey);

        if (!Object.keys(violationsCopy).length) {
            return allViolationsCount;
        }

        Object.keys(violationsCopy).forEach(function (vId) {
            var renderedViolation = '';
            var violation = violationsCopy[vId];
            var color = params.color;
            var isViolation = violation.resources && violation.resources.length !== 0 && (violation.resources.length > 0);

            violation.level = (!violation.level || violation.level === '') ?
                Constants.VIOLATION_LEVELS.INFORMATIONAL.name : violation.level;

            if (isSorting && !isNoViolation && params.levels[violation.level]) {
                color = params.levels[violation.level].color;
            }

            if (isSorting) {
                noViolationCount++;
                if (isViolation && (violation.level !== Constants.VIOLATION_LEVELS.INFORMATIONAL.name)) violationsCount++;

                var metaToRemove = AuditUtils.removeMetaPrefix(params.sortKey).replace(/[-_]/g, ' ')
                violation.metas = AuditUtils.removeFieldByValue(violation.metas, 'key', metaToRemove);
            }
            else {
                if (isViolation) violationsCount += violation.resources.length;
                else noViolationCount++;
                allViolationsCount = violationsCount;
            }

            renderedBlock += renderViolationRow({
                resultsType: params.resultsType,
                violation: violation,
                violationId: vId,
                isViolation: isViolation,
                isSorting: isSorting,
                color: color,
                subHeader: getSubHeader({
                    violation: violation,
                    sortKey: params.sortKey
                })
            });

            sectionSummary.value += violationsCopy[vId].resources.length;
        });

        if (isSorting) allViolationsCount = violationsCount;

        var header = renderHeader({
            name: AuditUtils.getBlockHeader(params.key, params.sortKey, isNoViolation),
            key: params.key,
            isSorting: isSorting,
            isInformational: isInformational,
            isNoViolation: isNoViolation,
            violationsCount: violationsCount,
            noViolationCount: noViolationCount
        });

        var rowLayout = Templates.violationBlockWrapper({
            header: header,
            key: params.key,
            renderedBlock: renderedBlock,
            isNoViolation: isNoViolation
        });

        if (isNoViolation) $(containers.noViolation).append(rowLayout);
        else if (isInformational) $(containers.informational).append(rowLayout);
        else $(containers.mainDataContainerSelector).append(rowLayout);

        return allViolationsCount;
    }

    function renderPie(listOfAlerts) {
        var pieData = [];
        var unknownLevels = [];
        var isSorting = AuditUtils.isSorting(self.sortKey);

        if (isSorting) {
            unknownLevels = Object.keys(listOfAlerts[self.sortKey].levels);
        }
        else {
            unknownLevels = Object.keys(listOfAlerts);
        }

        var countResources = function (key, alerts) {
            var sortKey = isSorting ? Constants.SORTKEYS.level.name : self.sortKey;

            return Object.keys(alerts).reduce(function (counter, vId) {
                if (alerts[vId][sortKey] === key) counter += alerts[vId].resources.length;
                return counter;
            }, 0);
        };

        var fillData = function (key) {

            var summary = {};
            var alerts = {};

            if (isSorting) {
                summary = {label: key, value: 0, color: listOfAlerts[self.sortKey].levels[key].color};
                alerts = listOfAlerts[self.sortKey].alerts;
            }
            else {
                summary = {label: key, value: 0, color: listOfAlerts[key].color};
                alerts = listOfAlerts[key].alerts;
            }
            summary.value = countResources(key, alerts);

            pieData.push(summary);
        };

        unknownLevels.forEach(function (key) {
            if(self.sortKey!="level" || key.toLowerCase()!=Constants.VIOLATION_LEVELS.INFORMATIONAL.name.toLowerCase()){
                fillData(key);
            }
        });

        pieData.sort(function (a, b) {
            if (!Constants.PRIORITY_OF_LEVELS[a.label]) return -1;
            if (!Constants.PRIORITY_OF_LEVELS[b.label]) return 1;
            return Constants.PRIORITY_OF_LEVELS[a.label] > Constants.PRIORITY_OF_LEVELS[b.label];
        });

        pie.drawPie(pieData);
    }


    function renderInformationalSection(sortKey, object) {
        renderSection({
            violations: object.alerts,
            key: Constants.RESULT_TYPE.INFORMATIONAL,
            color: colorPalette.SeverityTones.Informational,
            resultsType: Constants.RESULT_TYPE.INFORMATIONAL,
            sortKey: sortKey
        });
    }


    function renderViolationDivider(sortKey) {
        $(containers.noViolation).html('');
        if (!AuditUtils.isSorting(sortKey)) {
            var endOfViolationsMsg = Templates.endOfViolationDivider();
            $(containers.informational).prepend(endOfViolationsMsg);
        }
    }


    function renderResourcesList(listOfAlerts) {
        var groupKeys = [];
        var chartHeader = '';

        initView();

        renderPie(listOfAlerts);

        if (listOfAlerts[Constants.VIOLATION_LEVELS.INFORMATIONAL.name]) {
            delete listOfAlerts[Constants.VIOLATION_LEVELS.INFORMATIONAL.name];
        }

        var violationsCount = 0;
        var isSorting = AuditUtils.isSorting(self.sortKey);

        if (self.sortKey === Constants.SORTKEYS.level.name) {
            groupKeys = AuditUtils.sortObjectKeysByPriority(Object.keys(listOfAlerts), Constants.PRIORITY_OF_LEVELS);
        } else {
            groupKeys = Object.keys(listOfAlerts);
        }

        groupKeys.forEach(function (key) {
            var renderParams = {
                violations: listOfAlerts[key].alerts,
                key: key,
                color: listOfAlerts[key].color,
                resultsType: Constants.RESULT_TYPE.VIOLATIONS,
                sortKey: self.sortKey
            };

            if (isSorting) renderParams.levels = listOfAlerts[self.sortKey].levels;

            violationsCount += renderSection(renderParams);
        });


        if (isSorting) {
            chartHeader = violationsCount === 1 ? uiTexts.CHART_HEADER.RULE : uiTexts.CHART_HEADER.RULES;
            setChartHeaderText(chartHeader, self.sortKey, violationsCount);
            var violationNum = Object.keys(listOfAlerts[self.sortKey].alerts).length;
        } else {
            chartHeader = violationsCount === 1 ? uiTexts.CHART_HEADER.CLOUD_OBJECT : uiTexts.CHART_HEADER.CLOUD_OBJECTS;
            setChartHeaderText(chartHeader, self.sortKey, violationsCount);
        }

        $('.pie-data-header .num').html(violationsCount);

        return listOfAlerts;
    }


    function setChartHeaderText(text, sortKey, violationsCount) {

        violationsCount = typeof violationsCount !== 'undefined' ? violationsCount : 0;

        var isSorting = AuditUtils.isSorting(sortKey);
        var sortLabel = isSorting ? Constants.SORTKEYS[sortKey].label : '';
        var header = sortLabel + ' ' + text;
        if (violationsCount === 0 && sortKey === 'level'){
            header = "Violating " + header;
        }
        $(containers.CHART_HEADER).text(header);
    }


    function initView() {
        $(containers.mainDataContainerSelector).html('').css('background', '');
        $(containers.noRulesMessageSelector).addClass('hidden');
    }


    function clearContainer() {
        $(containers.mainDataContainerSelector).html('').css('background', '');
        $(containers.informational).html('');
        $(containers.noViolation).html('');
    }


    function render(listOfAlerts, sortKey) {
        self.sortKey = sortKey;
        renderResourcesList(listOfAlerts);
    }


    function AuditRender(sortKey) {
        self = this;
        self.sortKey = sortKey;
    }


    AuditRender.prototype.renderSection = renderSection;
    AuditRender.prototype.renderInformationalSection = renderInformationalSection;
    AuditRender.prototype.renderPie = renderPie;
    AuditRender.prototype.setChartHeaderText = setChartHeaderText;
    AuditRender.prototype.drawPie = drawPie;
    AuditRender.prototype.renderViolationDivider = renderViolationDivider;
    AuditRender.prototype.render = render;
    AuditRender.prototype.clearContainer = clearContainer;

    return AuditRender;
}());