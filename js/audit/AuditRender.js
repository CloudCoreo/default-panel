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

        var isNoViolation = options.resultsType === 'RULES';
        var visibleList = '';
        var visibleCount = 0;
        var violationsCount = 0;
        var rendered;
        var noViolationCount = isNoViolation ? Object.keys(options.violations).length : 0;

        Object.keys(options.violations).forEach(function (vId) {
            var violation = options.violations[vId];
            var isViolation = !isNoViolation && violation.resources.length > 0;
            var params = {
                resultsType: options.resultsType,
                violation: violation,
                isViolation: isViolation,
                isVisible: isViolation || violation.isPassed || (!violation.isPassed && options.isDisabledVisible)
            };

            rendered = violationTpl.render(params);
            visibleList += rendered;
            visibleCount++;
            sectionSummary.value += options.violations[vId].resources.length;

            if (options.violations[vId].resources.length) violationsCount += 1;
        });

        var headerData = {
            name: utils.replaceSymbolToSpace(options.key, '-'),
            key: options.key,
            resultsCount: violationsCount || noViolationCount,
            resultsType: isNoViolation ? 'RULES' : 'VIOLATIONS'
        };

        var header = headerTpl.render(headerData);

        var html =
            '<div class="' + (isNoViolation ? 'bg-light-grey' : 'bg-white') + '" style="border-color: ' + (isNoViolation ? 'grey' : sectionSummary.color) + '">' +
            visibleList + '</div>';

        if (!AuditUtils.isMetaAttribute(options.sortKey)) {
            headerData.resultsCount -= noViolationCount;
            html = '<div class="' + headerData.key + ' layout-padding ' + (!isNoViolation ? 'bg-white' : '') + '" style="margin-bottom: 20px;">' + header + html;
        }

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
                resultsType: 'VIOLATIONS',
                sortKey: self.sortKey,
                isDisabledVisible: self.isDisabledViolationsVisible
            });
        });

        if (AuditUtils.isMetaAttribute(self.sortKey)) {
            var headerData = {
                name: 'Sort by ' + AuditUtils.removeMetaPrefix(self.sortKey),
                resultsCount: violationsCount,
                resultsType: violationsCount > 1 ? "VIOLATIONS" : "VIOLATION"
            };
            var header = headerTpl.render(headerData);
            $(containers.mainDataContainerSelector).prepend(header).css('background', '#ffffff');
        }

        $('.pie-data-header .num').html(violationsCount);

        return listOfAlerts;
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

    return AuditRender;
}());