window.AuditRender = (function () {

    var self;

    var containers = constants.CONTAINERS;
    var colorPalette = constants.COLORS;
    var templates = constants.TEMPLATES;

    var pie = new ResourcesPie(containers.pieChartSelector);

    var headerTpl = $.templates(templates.LIST_HEADER),
        violationTpl = $.templates(templates.VIOLATION_ROW);


    function getCounterLabel(options) {
        if (options.isInformational) return options.violationsCount + ' ' + uiTexts.LABELS.CLOUD_OBJECTS;
        if (options.isSorting) {
            return options.violationsCount + ' ' + uiTexts.LABELS.VIOLATING_OBJECTS + ' ' +
                    options.noViolationCount + ' ' + uiTexts.LABELS.RULES;
        }
        else if (options.isNoViolation) {
            return options.noViolationCount + ' ' + uiTexts.LABELS.RULES;
        }
        return options.violationsCount + ' ' + uiTexts.LABELS.VIOLATING_OBJECTS;
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
                constants.VIOLATION_LEVELS.INFORMATIONAL : violation.level;

            var isViolation = violation.resources && violation.resources.length && violation.resources.length > 0;
            var params = {
                resultsType: options.resultsType,
                violation: violation,
                isViolation: isViolation,
                isVisible: isViolation || violation.isPassed || (!violation.isPassed && options.isDisabledVisible),
                isPassed: violation.isPassed
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
        var groups = [];
        var isSorting = AuditUtils.isMetaAttribute(self.sortKey);

        if (isSorting) {
            groups = listOfAlerts[self.sortKey].levels;
        }
        else {
            groups = listOfAlerts;
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

        if (self.sortKey === constants.SORTKEYS.LEVEL || isSorting) {
            Object.keys(colorPalette.SeverityTones).forEach(function (key) {
                if (groups[key] && (groups[key].alerts || groups[key].count)) fillData(key);
            });
        }
        else {
            unknownLevels.forEach(function (key) {
                fillData(key);
            });
        }

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
        $(containers.mainDataContainerSelector).html('').css('background', '');

        renderPie(listOfAlerts);

        if (listOfAlerts[constants.VIOLATION_LEVELS.INFORMATIONAL]) {
            delete listOfAlerts[constants.VIOLATION_LEVELS.INFORMATIONAL];
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
            setChartHeaderText(uiTexts.CHART_HEADER.RULES);
        } else {
            setChartHeaderText(uiTexts.CHART_HEADER.CLOUD_OBJECTS);
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