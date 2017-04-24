Window.Render = (function () {

    var pie = new ResourcesPie(containers.pieChartSelector);

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
            name: key,
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
            html = '<div class="' + headerData.name + ' layout-padding ' + (!isPassedOrDisabled ? 'bg-white' : '') + '" style="margin-bottom: 20px;">' + header + html;
        }

        if (isPassedOrDisabled) {
            $(containers.noViolation).append(html);
        } else {
            $(containers.mainDataContainerSelector).append(html);
        }

        return violationsCount;
    }


    function renderPie(sortKey) {
        var pieData = [];
        var listOfAlerts = organizeDataForCurrentRender(sortKey);
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



    function Render(sortKey) {

    }


    Render.prototype.renderSection = renderSection;
    Render.prototype.renderPie = renderPie;
    Render.prototype.drawPie = drawPie;

    return Render;
})();