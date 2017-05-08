var colorPalette = constants.COLORS;
var containers = constants.CONTAINERS;
var uiTexts = constants.UITEXTS;


window.AuditUI = {

    initView: function () {
        $(containers.mainCont).removeClass('hidden');
        $(containers.warningBlock).addClass('hidden');
        $(containers.mainDataContainerSelector).html('');
        $(containers.noAuditResourcesMessageSelector).addClass('hidden');
        $(containers.noViolationsMessageSelector).addClass('hidden');
        $(containers.planIsExecuting).addClass('hidden');
        $(containers.mainCont).removeClass('empty');
    },

    showResourcesAreBeingLoadedMessage: function () {
        $(containers.planIsExecuting).removeClass('hidden');
        $(containers.noAuditResourcesMessageSelector).addClass('hidden');
        $(containers.mainCont).addClass('empty');
    },


    showNoAuditResourcesMessage: function () {
        $(containers.noAuditResourcesMessageSelector).removeClass('hidden');
        $(containers.mainCont).addClass('empty');
    },


    showNoViolationsMessage: function () {
        $(containers.noViolationsMessageSelector).removeClass('hidden');
    },


    scrollToElement: function (element) {
        var tabsHeight = $('.options-container').height();
        $('.scrollable-area').animate({ scrollTop: element.offset().top - tabsHeight }, 200);
    },


    onDetailsBtnClick: function (elem) {
        var _this = $(elem);
        var body = _this.parent().next();
        body.toggleClass('hidden-row');
        var text = _this.text() === uiTexts.BUTTONS.HIDE_DETAILS ? uiTexts.BUTTONS.VIEW_DETAILS : uiTexts.BUTTONS.HIDE_DETAILS;
        _this.text(text);
    },


    refreshClickHandlers: function (listOfAlerts, noViolations) {
        $('.resources-link, .resources-title-link').click(function () {
            var _this = $(this);
            var params = AuditUtils.getOrganizedViolationData(_this, listOfAlerts);
            debugger
            openPopup(constants.POPUPS.VIOLATION_RESOURCES, params);
        });

        $('.share-link').click(function () {
            var _this = $(this);
            var params = AuditUtils.getOrganizedViolationData(_this, listOfAlerts);
            openPopup(constants.POPUPS.SHARE_VIOLATION, params);
        });

        $('.resources-suppressed-link').click(function (event) {
            var _this = $(this);
            var violationId = _this.attr('violation');

            var params = {
                violationId: _this.attr('violationId'),
                suppressions: noViolations[violationId].suppressions,
                color: colorPalette.Passed
            };

            event.preventDefault();
            event.stopPropagation();
            openPopup(constants.POPUPS.VIOLATION_RESOURCES, params);
        });

        $('.more-info-link').click(function () {
            var id = $(this).attr('violation');
            var link = $(this).attr('link');
            var params = {
                id: id,
                link: link
            };
            openPopup(constants.POPUPS.VIOLATION_MORE_INFO, params);
        });

        $('.details-btn').click(function () {
            AuditUI.onDetailsBtnClick(this);
        });
    }

};