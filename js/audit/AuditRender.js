window.AuditRender = (function () {

    var self;

    var containers = constans.CONTAINERS;
    var colorPalette = constans.COLORS;
    var templates = constans.TEMPLATES;

    var pie = new ResourcesPie(containers.pieChartSelector);

    var headerTpl = $.templates(templates.LIST_HEADER),
        violationTpl = $.templates(templates.VIOLATION_ROW),
        passedAndDisabledViolations = $.templates(templates.PASSED_DISABLED_ROW),
        errorTpl = $.templates(templates.VIOLATION_ERROR),
        showAllBtnTpl = $("#show-all-btn-tmpl").html();


    function renderSection(violations, key, color, resultsType, sortKey) {
        var sectionSummary = { label: key, value: 0, color: color };
        if (!Object.keys(violations).length) {
            return sectionSummary;
        }

        var isPassedOrDisabled = (resultsType === 'PASSED' || resultsType === 'DISABLED');
        var visibleList = '';
        var restList = '';
        var visibleCount = 0;
        var violationsCount = 0;
        var rendered;
        var noViolationCount = isPassedOrDisabled ? Object.keys(violations).length : 0;


        Object.keys(violations).forEach(function (vId) {
            var options = {
                resultsType: resultsType,
                violation: violations[vId],
                isViolation: !isPassedOrDisabled && violations[vId].resources.length > 0
            };

            rendered = violationTpl.render(options);

            if (visibleCount < 5) {
                visibleList += rendered;
            } else {
                restList += rendered;
            }
            visibleCount++;

            sectionSummary.value += violations[vId].resources.length;

            if (violations[vId].resources.length) violationsCount += 1;
        });

        var headerData = {
            name: utils.replaceSymbolToSpace(key, '-'),
            key: key,
            resultsCount: violationsCount || noViolationCount,
            resultsType: isPassedOrDisabled ? 'RULES' : 'VIOLATIONS'
        };

        var header = headerTpl.render(headerData);

        var html =
            '<div class="' + (isPassedOrDisabled ? 'bg-light-grey' : 'bg-white') + '" style="border-color: ' + (isPassedOrDisabled ? 'grey' : sectionSummary.color) + '">' +
            visibleList +
            '<div class="hidden" style="border-color: inherit;">' + restList + '</div>' +
            ((visibleCount > 5) ? showAllBtnTpl : '') +
            '</div>';

        if (sortKey !== 'meta_cis_id') {
            html = '<div class="' + headerData.key + ' layout-padding ' + (!isPassedOrDisabled ? 'bg-white' : '') + '" style="margin-bottom: 20px;">' + header + html;
        }

        $(containers.mainDataContainerSelector).append(html);

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
        if (sortKey !== 'meta_cis_id') {
            var endOfViolationsMsg = '<div class="violation-divider"><div class="text">end of violations</div></div>';
            $(containers.noViolation).prepend(endOfViolationsMsg);
        }
    }


    function renderResourcesList(listOfAlerts) {
        $(containers.mainDataContainerSelector).html('').css('background', '');

        renderPie(listOfAlerts);

        var violationsCount = 0;

        Object.keys(listOfAlerts).forEach(function (key) {
            violationsCount += renderSection(listOfAlerts[key].alerts, key, listOfAlerts[key].color, 'VIOLATIONS', self.sortKey);
        });

        if (self.sortKey === 'meta_cis_id') {
            var headerData = {
                name: 'Sort by CIS ID',
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


    function AuditRender(sortKey) {
        self = this;
        self.sortKey = sortKey;
    }


    AuditRender.prototype.renderSection = renderSection;
    AuditRender.prototype.renderPie = renderPie;
    AuditRender.prototype.drawPie = drawPie;
    AuditRender.prototype.renderViolationDivider = renderViolationDivider;
    AuditRender.prototype.render = render;

    return AuditRender;
}());