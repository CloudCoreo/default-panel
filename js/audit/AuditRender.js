window.AuditRender = (function () {

    var self;

    var containers = constants.CONTAINERS;
    var colorPalette = constants.COLORS;
    var templates = constants.TEMPLATES;

    var pie = new ResourcesPie(containers.pieChartSelector);

    var headerTpl = $.templates(templates.LIST_HEADER),
        violationTpl = $.templates(templates.VIOLATION_ROW);


    function renderSection(options) {

        var sectionSummary = { label: options.key, value: 0, color: options.color };
        if (!Object.keys(options.violations).length) {
            return sectionSummary;
        }

        var isNoViolation = options.resultsType === constants.RESULT_TYPE.RULES;
        var violationsCount = 0;
        var noViolationCount = 0;
        var rendered = '';
        var isSorting = AuditUtils.isMetaAttribute(options.sortKey);

        Object.keys(options.violations).forEach(function (vId) {
            var violation = options.violations[vId];
            var isViolation = violation.resources && violation.resources.length && violation.resources.length > 0;
            var params = {
                resultsType: options.resultsType,
                violation: violation,
                isViolation: isViolation,
                isVisible: isViolation || violation.isPassed || (!violation.isPassed && options.isDisabledVisible),
                isPassed: violation.isPassed
            };

            if (isViolation) violationsCount++;
            else noViolationCount++;

            rendered += violationTpl.render(params);
            sectionSummary.value += options.violations[vId].resources.length;
        });

        var headerData = {
            name: options.key.replace(/[-_]/g, ' '),
            key: options.key,
            resultInfo: {
                violationsCount: violationsCount,
                noViolationCount: noViolationCount,
                resultsType: isNoViolation ? constants.RESULT_TYPE.RULES : constants.UITEXTS.LABELS.VIOLATING_OBJECTS
            },
            isSorting: isSorting
        };

        var header = headerTpl.render(headerData);

        var html = '<div class="' + headerData.key + ' layout-padding ' + (!isNoViolation ? 'bg-white' : '') + '" style="margin-bottom: 20px;">' +
            header +
            '<div class="' + (isNoViolation ? 'bg-light-grey' : 'bg-white') +
            '" style="border-color: ' + (isNoViolation ? 'grey' : sectionSummary.color) + '">' + rendered + '</div>';


        if (isNoViolation) {
            $(containers.noViolation).append(html);
        } else {
            $(containers.mainDataContainerSelector).append(html);
        }

        return violationsCount;
    }


    function renderPie(listOfAlerts) {
        var pieData = [];

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
            }
        });

        unknownLevels.forEach(function (key) {
            fillData(key);
        });

        pie.drawPie(pieData);
    }


    function renderViolationDivider (sortKey) {
        $(containers.noViolation).html('');
        if (!AuditUtils.isMetaAttribute(sortKey)) {
            var endOfViolationsMsg = '<div class="violation-divider"><div class="text">end of violations</div></div>';
            $(containers.noViolation).prepend(endOfViolationsMsg);
        }
    }


    function renderResourcesList(listOfAlerts) {
        $(containers.mainDataContainerSelector).html('').css('background', '');

        renderPie(listOfAlerts);

        var violationsCount = 0;

        Object.keys(listOfAlerts).forEach(function (key) {
            violationsCount += renderSection({
                violations: listOfAlerts[key].alerts,
                key: key,
                color: listOfAlerts[key].color,
                resultsType: constants.RESULT_TYPE.VIOLATIONS,
                sortKey: self.sortKey,
                isDisabledVisible: self.isDisabledViolationsVisible
            });
        });

        if (AuditUtils.isMetaAttribute(self.sortKey)) {
            $('.pie-data-header .chart-header').text('Rules with Violations');
        } else {
            $('.pie-data-header .chart-header').text('Violating Cloud Objects');
        }
        $('.pie-data-header .num').html(violationsCount);

        return listOfAlerts;
    }


    function clearContainer() {
        $(containers.mainDataContainerSelector).html('').css('background', '');
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
    AuditRender.prototype.renderPie = renderPie;
    AuditRender.prototype.drawPie = drawPie;
    AuditRender.prototype.renderViolationDivider = renderViolationDivider;
    AuditRender.prototype.render = render;
    AuditRender.prototype.clearContainer = clearContainer;

    return AuditRender;
}());