window.AuditRender = (function () {

    var self;

    var containers = constants.CONTAINERS;
    var colorPalette = constants.COLORS;
    var templates = constants.TEMPLATES;

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

    function renderSection(options) {

        var sectionSummary = { label: options.key, value: 0, color: options.color };
        if (!Object.keys(options.violations).length) {
            return sectionSummary;
        }

        var isNoViolation = options.resultsType === constants.RESULT_TYPE.RULES;
        var isInformational = options.resultsType === constants.RESULT_TYPE.INFORMATIONAL;
        var violationsCount = 0;
        var noViolationCount = 0;
        var renderedBlock = '';
        var isSorting = AuditUtils.isMetaAttribute(options.sortKey);

        Object.keys(options.violations).forEach(function (vId) {
            var renderedViolation = '';
            var violation = options.violations[vId];
            var color = options.color;
            violation.level = (!violation.level || violation.level === '') ?
                constants.VIOLATION_LEVELS.INFORMATIONAL.name : violation.level;

            var isViolation = violation.resources && violation.resources.length && violation.resources.length > 0;
            var params = {
                resultsType: options.resultsType,
                violation: violation,
                isViolation: isViolation,
                isVisible: isViolation || violation.isPassed || (!violation.isPassed && options.isDisabledVisible),
                isPassed: violation.isPassed,
                isSorting: isSorting
            };

            if (isSorting && !isNoViolation && options.levels[violation.level]) {
                color = options.levels[violation.level].color;
            }

            if (isViolation) violationsCount++;
            else noViolationCount++;

            renderedViolation = '<div style="border-color: ' + color + ';">' + violationTpl.render(params) + '</div>';
            renderedBlock += renderedViolation;
            sectionSummary.value += options.violations[vId].resources.length;
        });

        var headerData = {
            name: options.key.replace(/[-_]/g, ' '),
            key: options.key,
            label: getCounterLabel({
                isSorting: isSorting,
                isInformational: isInformational,
                isNoViolation: isNoViolation,
                violationsCount: violationsCount,
                noViolationCount: noViolationCount
            }),
            isSorting: isSorting
        };

        var header = headerTpl.render(headerData);

        var html = '<div class="' + headerData.key + ' layout-padding ' + (!isNoViolation ? 'bg-white' : '') +
            '" style="margin-bottom: 20px;">' + header +
            '<div class="' + (isNoViolation ? 'bg-light-grey' : 'bg-white') + '">' + renderedBlock + '</div>';


        if (isNoViolation) $(containers.noViolation).append(html);
        else if (isInformational) $(containers.informational).append(html);
        else $(containers.mainDataContainerSelector).append(html);

        return violationsCount;
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
        var isSorting = AuditUtils.isMetaAttribute(self.sortKey);

        if (isSorting) {
            unknownLevels = Object.keys(listOfAlerts[self.sortKey].levels);
        }
        else {
            unknownLevels = Object.keys(listOfAlerts);
        }

        var countResources = function (key, alerts) {
            var sortKey = isSorting ? constants.SORTKEYS.LEVEL : self.sortKey;

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
            if (!constants.PRIORITY_OF_LEVELS[a.label]) return -1;
            if (!constants.PRIORITY_OF_LEVELS[b.label]) return 1;
            return constants.PRIORITY_OF_LEVELS[a.label] > constants.PRIORITY_OF_LEVELS[b.label];
        });

        pie.drawPie(pieData);
    }


    function renderInformationalSection(sortKey, object) {
        renderSection({
            violations: object.alerts,
            key: constants.RESULT_TYPE.INFORMATIONAL,
            color: colorPalette.SeverityTones.Informational,
            resultsType: constants.RESULT_TYPE.INFORMATIONAL,
            sortKey: sortKey
        });
    }


    function renderViolationDivider (sortKey) {
        $(containers.noViolation).html('');
        if (!AuditUtils.isMetaAttribute(sortKey)) {
            var endOfViolationsMsg = '<div class="violation-divider"><div class="text">end of violations</div></div>';
            $(containers.informational).prepend(endOfViolationsMsg);
        }
    }


    function renderResourcesList(listOfAlerts) {
        var groupKeys = [];
        var chartHeader = '';
        $(containers.mainDataContainerSelector).html('').css('background', '');

        renderPie(listOfAlerts);

        if (listOfAlerts[constants.VIOLATION_LEVELS.INFORMATIONAL.name]) {
            delete listOfAlerts[constants.VIOLATION_LEVELS.INFORMATIONAL.name];
        }

        var violationsCount = 0;
        var isSorting = AuditUtils.isMetaAttribute(self.sortKey);

        if (self.sortKey === constants.SORTKEYS.LEVEL) {
            groupKeys = AuditUtils.sortObjectKeysByPriority(Object.keys(listOfAlerts), constants.PRIORITY_OF_LEVELS);
        } else {
            groupKeys = Object.keys(listOfAlerts);
        }

        groupKeys.forEach(function (key) {
            var renderParams = {
                violations: listOfAlerts[key].alerts,
                key: key,
                color: listOfAlerts[key].color,
                resultsType: constants.RESULT_TYPE.VIOLATIONS,
                sortKey: self.sortKey,
                isDisabledVisible: self.isDisabledViolationsVisible
            };

            if (isSorting) renderParams.levels = listOfAlerts[self.sortKey].levels;

            violationsCount += renderSection(renderParams);
        });

        if (AuditUtils.isMetaAttribute(self.sortKey)) {
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