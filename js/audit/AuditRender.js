window.AuditRender = (function () {

    var self;

    var containers = Constants.CONTAINERS;
    var colorPalette = Constants.COLORS;
    var templates = Constants.TEMPLATE_IDS;

    var pie = new ResourcesPie(containers.pieChartSelector);

    var headerTpl = $.templates(templates.LIST_HEADER),
        violationTpl = $.templates(templates.VIOLATION_ROW);


    function getCounterLabel(options) {
        var violationCount =  options.violationsCount;
        var noViolationCount =  options.noViolationCount;
        var isNotPlural = options.violationsCount === 1;

        if (options.isInformational) {
            return violationCount + ' ' + (isNotPlural ? uiTexts.LABELS.CLOUD_OBJECT : uiTexts.LABELS.CLOUD_OBJECTS);
        }
        if (options.isSorting) {
            return violationCount + ' ' + (violationCount === 1 ? uiTexts.LABELS.VIOLATING_OBJECT : uiTexts.LABELS.VIOLATING_OBJECTS) + ' ' +
                noViolationCount + ' ' + (noViolationCount === 1 ? uiTexts.LABELS.RULE : uiTexts.LABELS.RULES);
        }
        if (options.isNoViolation) {
            isNotPlural = noViolationCount === 1;
            return noViolationCount + ' ' + (isNotPlural ? uiTexts.LABELS.RULE : uiTexts.LABELS.RULES);
        }
        return violationCount + ' ' + (isNotPlural ? uiTexts.LABELS.VIOLATING_OBJECT : uiTexts.LABELS.VIOLATING_OBJECTS);
    }

    function renderHeader(options) {
        return headerTpl.render({
            name: options.name,
            key: options.key,
            label: getCounterLabel({
                isSorting: options.isSorting,
                isInformational: options.isInformational,
                isNoViolation: options.isNoViolation,
                violationsCount: options.violationsCount,
                noViolationCount: options.noViolationCount
            }),
            isSorting: options.isSorting
        });
    }
    
    function renderViolationRow(options) {
        options.isVisible = options.isViolation || options.violation.isPassed || (!options.violation.isPassed && options.isDisabledVisible);;

        return Templates.violationBlock({
            renderOptions: options,
            violationTpl: violationTpl,
            color: options.color
        });
    }

    function renderSection(options) {

        var sectionSummary = { label: options.key, value: 0, color: options.color };
        if (!Object.keys(options.violations).length) {
            return sectionSummary;
        }

        var isNoViolation = options.resultsType === Constants.RESULT_TYPE.RULES;
        var isInformational = options.resultsType === Constants.RESULT_TYPE.INFORMATIONAL;
        var violationsCount = 0;
        var noViolationCount = 0;
        var allViolationsCount = 0;
        var renderedBlock = '';
        var isSorting = AuditUtils.isSorting(options.sortKey);

        Object.keys(options.violations).forEach(function (vId) {
            var renderedViolation = '';
            var violation = options.violations[vId];
            var color = options.color;
            var isViolation = violation.resources && violation.resources.length && violation.resources.length > 0;

            violation.level = (!violation.level || violation.level === '') ?
                Constants.VIOLATION_LEVELS.INFORMATIONAL.name : violation.level;

            if (isSorting && !isNoViolation && options.levels[violation.level]) {
                color = options.levels[violation.level].color;
            }

            renderedBlock += renderViolationRow({
                resultsType: options.resultsType,
                violation: violation,
                isViolation: isViolation,
                isDisabledVisible: options.isDisabledVisible,
                isPassed: violation.isPassed,
                isSorting: isSorting,
                color: color
            });

            if (isSorting) {
                if (isViolation && (violation.level !== Constants.VIOLATION_LEVELS.INFORMATIONAL.name)) violationsCount++;
                else noViolationCount++;
            }
            else {
                if (isViolation) violationsCount += violation.resources.length;
                else noViolationCount++;
                allViolationsCount = violationsCount;
            }

            sectionSummary.value += options.violations[vId].resources.length;
        });
        if (isSorting) allViolationsCount = violationsCount;

        var header = renderHeader({
            name: options.key.replace(/[-_]/g, ' '),
            key: options.key,
            isSorting: isSorting,
            isInformational: isInformational,
            isNoViolation: isNoViolation,
            violationsCount: violationsCount,
            noViolationCount: noViolationCount
        });

        var rowLayout = Templates.violationBlockWrapper({
            header: header,
            key: options.key,
            renderedBlock: renderedBlock,
            isNoViolation: isNoViolation
        });

        if (isNoViolation) $(containers.noViolation).append(rowLayout);
        else if (isInformational) $(containers.informational).append(rowLayout);
        else $(containers.mainDataContainerSelector).append(rowLayout);

        return allViolationsCount;
    }

    function renderAllClearPie(emptyRules) {
        pie.drawPie([{
            label: 'Passed',
            value: Object.keys(emptyRules).length,
            color: colorPalette.Passed
        }]);
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
                summary = { label: key, value: 0, color: listOfAlerts[self.sortKey].levels[key].color };
                alerts = listOfAlerts[self.sortKey].alerts;
            }
            else {
                summary = { label: key, value: 0, color: listOfAlerts[key].color };
                alerts = listOfAlerts[key].alerts;
            }
            summary.value = countResources(key, alerts);

            pieData.push(summary);
        };

        unknownLevels.forEach(function (key) {
            fillData(key);
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


    function renderViolationDivider (sortKey) {
        $(containers.noViolation).html('');
        if (!AuditUtils.isSorting(sortKey)) {
            var endOfViolationsMsg = Templates.endOfViolationDivider();
            $(containers.informational).prepend(endOfViolationsMsg);
        }
    }


    function renderResourcesList(listOfAlerts) {
        var groupKeys = [];
        var chartHeader = '';
        $(containers.mainDataContainerSelector).html('').css('background', '');

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
                sortKey: self.sortKey,
                isDisabledVisible: self.isDisabledViolationsVisible
            };

            if (isSorting) renderParams.levels = listOfAlerts[self.sortKey].levels;

            violationsCount += renderSection(renderParams);
        });

        if (AuditUtils.isSorting(self.sortKey)) {
            chartHeader = violationsCount === 1 ? uiTexts.CHART_HEADER.RULE : uiTexts.CHART_HEADER.RULES;
            setChartHeaderText(chartHeader);
        } else {
            chartHeader = violationsCount === 1 ? uiTexts.CHART_HEADER.CLOUD_OBJECT : uiTexts.CHART_HEADER.CLOUD_OBJECTS;
            setChartHeaderText(chartHeader);
        }
        $('.pie-data-header .num').html(violationsCount);

        return listOfAlerts;
    }

    function setChartHeaderText(text) {
        $(containers.CHART_HEADER).text(text);
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


    function AuditRender(sortKey, isDisabledViolationsVisible) {
        self = this;
        self.isDisabledViolationsVisible = isDisabledViolationsVisible;
        self.sortKey = sortKey;
    }


    AuditRender.prototype.renderSection = renderSection;
    AuditRender.prototype.renderInformationalSection = renderInformationalSection;
    AuditRender.prototype.renderPie = renderPie;
    AuditRender.prototype.renderAllClearPie = renderAllClearPie;
    AuditRender.prototype.setChartHeaderText = setChartHeaderText;
    AuditRender.prototype.drawPie = drawPie;
    AuditRender.prototype.renderViolationDivider = renderViolationDivider;
    AuditRender.prototype.render = render;
    AuditRender.prototype.clearContainer = clearContainer;

    return AuditRender;
}());