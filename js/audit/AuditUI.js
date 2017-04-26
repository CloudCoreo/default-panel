var colorPalette = constans.COLORS;
var containers = constans.CONTAINERS;
var uiTexts = constans.UITEXTS;


var AuditUI = {

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


    onShowAllBtnClick: function (elem) {
        var _this = $(elem);
        var list = _this.prev();
        if (list.hasClass('hidden')) {
            list.removeClass('hidden');
            _this.html(uiTexts.BUTTONS.SHOW_LESS);
        } else {
            list.addClass('hidden');
            _this.html(uiTexts.BUTTONS.VIEW_DETAILS);
        }
    },


    onDetailsBtnClick: function (elem) {
        var _this = $(elem);
        var body = _this.parent().next();
        body.toggleClass('hidden-row');
        var text = _this.text() === uiTexts.BUTTONS.HIDE_DETAILS ? uiTexts.BUTTONS.VIEW_DETAILS : uiTexts.BUTTONS.HIDE_DETAILS;
        _this.text(text);
    },


    fillHtmlSummaryData: function (isError, passedNum, disabledNum) {
        $('.additional-info .passed').html(isError ? ' Passed' : passedNum + ' Passed');
        $('.additional-info .disabled').html(disabledNum + ' Disabled');
    },


    refreshClickHandlers: function (listOfAlerts, params, passedViolations) {
        $('.resources-link, .resources-title-link').click(function () {
            var _this = $(this);
            var params = AuditUtils.getOrganizedViolationData(_this, listOfAlerts);
            openPopup(constans.POPUPS.VIOLATION_RESOURCES, params);
        });

        $('.share-link').click(function () {
            var _this = $(this);
            var params = AuditUtils.getOrganizedViolationData(_this, listOfAlerts);
            openPopup(constans.POPUPS.SHARE_VIOLATION, params);
        });

        $('.resources-suppressed-link').click(function (event) {
            var _this = $(this);
            var violationId = _this.attr('violation');

            var params = {
                violationId: _this.attr('violationId'),
                suppressions: passedViolations[violationId].suppressions,
                color: colorPalette.Passed
            };

            event.preventDefault();
            event.stopPropagation();
            openPopup(constans.POPUPS.VIOLATION_RESOURCES, params);
        });

        $('.more-info-link').click(function () {
            var id = $(this).attr('violation');
            var link = $(this).attr('link');
            var params = {
                id: id,
                link: link
            };
            openPopup(constans.POPUPS.VIOLATION_MORE_INFO, params);
        });

        $('.show-all').click(function () {
            AuditUI.onShowAllBtnClick(this);
        });

        $('.details-btn').click(function () {
            AuditUI.onDetailsBtnClick(this);
        });
    }

};