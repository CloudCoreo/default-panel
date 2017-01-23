window.Deploy = (function () {
    var resources = [];
    var totalNumberOfResources = 0;
    var planRefreshIntervalInHours = 24;
    var lastExecutionDate = new Date();
    var numberOfFailedResource = -1;
    var numberOfNotExecutedResources = 0;
    var resourcesAlerts = false;
    var isEnabled = false;
    var resourceWithError;
    var initialData;

    var itemsOnPage = 50;
    var currentPage = 0;

    function getYesterdayDate() {
        var yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        return yesterdayDate;
    }

    function renderResourcesList() {
        $('.deploy .sort-label.mobile').click(function () {
            var _this = $(this);
            var label = _this.text();
            $(".deploy .chosen-item-text").text(label);
            _this.parent().addClass('hidden');
        });
        $('.resources-list').html('');
        var rowTmpl = $.templates('#resource-row-tmpl');
        if (currentPage * itemsOnPage > resources.length) {
            currentPage = Math.round(resources.length / itemsOnPage);
        }

        for (var i = currentPage * itemsOnPage; i < (currentPage + 1) * itemsOnPage && i < resources.length; ++i) {
            var html = $(rowTmpl.render(resources[i]));
            $('.resources-list').append(html);
            appendLogs(resources[i].inputs, html.find('.logs .inputs .data-cont'));
            appendLogs(resources[i].outputs, html.find('.logs .outputs .data-cont'));
        }
        initializeRowsActions();
    }

    function initializeRowsActions() {
        $('.resources-list .resource-row .view-row').click(function (e) {
            $(this).toggleClass('opened');
            $(this).next('.expandable-row').toggleClass('hidden');
        });
        $('.openInputs').on('click', function (e) {
            var resId = $(this).attr('resource');
            openPopup('showFullResourceData', resId);
        });
        $('.truncated').on('click', function (e) {
            var objectKey = $(this).attr('objectKey');
            var runId = $(this).parent().parent().attr('runId');
            var resourceId = $(this).parent().parent().attr('resource');
            openPopup('showTruncatedObject', { objectKey: objectKey, resourceId: resourceId, runId: runId });
        });
    }

    function appendLogs(data, appendTo) {
        var count = 0;
        Object.keys(data).some(function (key) {
            ++count;
            var inputOutputRecordHtml = '';
            if (data[key].value.truncated){
                var objectKey = data[key].value.truncated.object_key;
                var objectSize = data[key].value.truncated.object_size;

                var linkHtml =  '<div class="input-record">' +
                                    data[key].name + ': ' +
                                        '<span class="truncated" objectKey="'+objectKey+'">' +
                                            'Click to view full message ('+objectSize+' bytes)' +
                                        '</span>' +
                                '</div>';
                inputOutputRecordHtml = $(linkHtml);
            }
            else if (data[key].name == 'error') {
                appendTo.find('.label').hide();
                var errorTpl = $.templates('#error-tpl');
                inputOutputRecordHtml = $(errorTpl.render(data[key].value));
            }
            else {
                var parsed = JSON.parse(JSON.stringify(data[key].value));
                if (typeof data[key].value !== 'string') {
                    parsed = JSON.stringify(parsed);
                }
                inputOutputRecordHtml = $('<div class="input-record">' + data[key].name + ': <span class="value"></span></div>');
                inputOutputRecordHtml.find('.value').text(parsed);
            }
            appendTo.append(inputOutputRecordHtml);
            if (appendTo.html().length > 1500 || count >= 11) {
                appendTo.parent().find('.view-more').removeClass('hidden');
                return true;
            }
            return false;
        });
    }

    function appendNumberOfResultsLabel() {
        $('.resources-amount').html("SHOWING " +
            ((currentPage * itemsOnPage) || 1 ) + "-" +
            ((resources.length > itemsOnPage * (currentPage + 1)) ? itemsOnPage * (currentPage + 1) : resources.length) +
            " OF " + resources.length + ' results');

        var pages = resources.length / itemsOnPage;
        if (pages <= 1) return;

        $('.pages').append('<div class="page active prev"><<</div>');
        for (var i = 0; i < pages; ++i) {
            $('.pages').append('<div value="' + i + '" class="page' + (currentPage === i ? ' active' : '') + ' value' + i + '">' + (i + 1) + '</div>');
        }
        $('.pages').append('<div class="page active next">>></div>');

        $('.page').click(function () {
            var _this = $(this);
            var newPage;

            if (_this.hasClass('next') && currentPage + 1 < pages) {
                newPage = currentPage + 1;
            } else if (_this.hasClass('prev') && currentPage - 1 >= 0) {
                newPage = currentPage - 1;
            } else if (_this.attr('value')) {
                newPage = _this.attr('value') * 1.0;
            }

            if (typeof newPage === "undefined" || currentPage === newPage) {
                return;
            }

            $('.page.value' + currentPage).removeClass('active');
            $('.page.value' + newPage).addClass('active');
            currentPage = newPage;

            renderResourcesList();
        });
    }

    function convertMillisecondsToHours(millisecinds) {
        return Math.floor(millisecinds / 1000 / 60 / 60);
    }

    function accountAdnGetHoursTillNextExecution() {
        if (lastExecutionDate && typeof lastExecutionDate !== Date) {
            lastExecutionDate = new Date(lastExecutionDate);
        }
        var nextExecutionDate = lastExecutionDate;
        nextExecutionDate.setHours(nextExecutionDate.getHours() + planRefreshIntervalInHours);
        var hoursLeftTillNextExecution = nextExecutionDate.getTime() - new Date().getTime();
        return convertMillisecondsToHours(hoursLeftTillNextExecution);
    }

    function appendNextExecutionTime() {
        var hoursTillNextExecution = accountAdnGetHoursTillNextExecution();
        var hoursLeftString = '';
        if (hoursTillNextExecution > 1) {
            hoursLeftString = 'in ' + hoursTillNextExecution + ' hours';
        } else {
            hoursLeftString = 'will start less than an hour';
        }
        $('.next-execution').html(hoursLeftString);
        $('.message-right-part').addClass('visible');
    }

    function appendNotExecutedResourcesNumberNotification() {
        $('.error.messages').removeClass('hidden');
        $('.error.messages .message-left-part .message-status').html('ERROR');
        // $('.error.messages .amount').html(numberOfNotExecutedResources);
    }

    function getOrdinalSuffix(num) {
        var oneTenth = num % 10;
        var oneHundredth = num % 100;
        if (oneTenth == 1 && oneHundredth != 11) {
            return num + "st";
        }
        if (oneTenth == 2 && oneHundredth != 12) {
            return num + "nd";
        }
        if (oneTenth == 3 && oneHundredth != 13) {
            return num + "rd";
        }
        return num + "th";
    }

    function appendNumberOfNotExecutedResources() {
        var notExecutedResources = totalNumberOfResources - numberOfFailedResource;
        var message = notExecutedResources;
        var messageEnd = ' not executed sequenced by ' + getOrdinalSuffix(numberOfFailedResource) + ' resource fail';
        if (notExecutedResources === 0) {
            message = 'The last resource was not executed';
        } else if (notExecutedResources > 1) {
            message += ' resources were' + messageEnd;
        } else {
            message += ' resource was' + messageEnd;
        }

        $('.error.messages .message-left-part .message').html(message);
    }

    function appendResourcesAlertsNotification() {
        $('.alert.messages').removeClass('hidden');
    }

    function appendSuccessulBuildNotification() {
        $('.ok.messages').removeClass('hidden');
    }

    function sort(sortKey, desc) {
        if (!resources) return;
        resources = resources.sort(function (a, b) {
            if (!desc) return a[sortKey] > b[sortKey] ? -1 : 1;
            return a[sortKey] > b[sortKey] ? 1 : -1;
        });
        renderResourcesList();
    }

    function initResourcesList(ccThisData) {
        initialData = ccThisData;
        var resource = {};
        ccThisData.forEach(function (data) {
            Object.keys(data).forEach(function (resourceData) {
                var resourceProperty = data[resourceData];
                if (resourceData == 'engineStatus') {
                    if (resourceProperty == 'OK') {
                        resource.engineStatus = 'SUCCESS';
                        resource.engineStatusClass = 'stable-status';
                    } else {
                        resource.engineStatusClass = 'error-status';
                        resource.engineStatus = 'ERROR';
                        numberOfFailedResource = data.executionNumber;
                        numberOfNotExecutedResources++;
                        resourceWithError = resource;
                    }
                } else if (resourceData == 'inputs') {
                    for (var i = 0; i < resourceProperty.length; i++) {
                        if (resourceProperty[i].name == 'action') {
                            resource.action = resourceProperty[i].value;
                            break;
                        }
                    }
                    resource[resourceData] = resourceProperty;
                } else if (resourceData == 'timestamp') {
                    resource.timestamp = utils.formatDate(resourceProperty);
                } else if (resourceData == 'executionTime') {
                    resource.executionTime = utils.formatTime(resourceProperty);
                } else {
                    resource[resourceData] = resourceProperty;
                }
            });
            resources.push(resource);
            resource = {};
        });

        if (!resources.length) {
            $('#no-deploy-resources').removeClass('hidden');
            $('.resources-list').addClass('empty');
            $('.resources-list-header').addClass('empty');
            return;
        }

        appendNumberOfResultsLabel();
        if (isEnabled) {
            appendNextExecutionTime();
        }
        if (numberOfNotExecutedResources > 0) {
            appendNotExecutedResourcesNumberNotification();
            appendNumberOfNotExecutedResources();
        }
        if (resourcesAlerts) {
            appendResourcesAlertsNotification();
        }
        if (numberOfNotExecutedResources <= 0 && !resourcesAlerts) {
            appendSuccessulBuildNotification();
        }
    }

    function getInitializedCcThisData(ccThisData) {
        if (!ccThisData.resourcesArray) ccThisData.resourcesArray = [];
        if (!ccThisData.numberOfResources) ccThisData.numberOfResources = 0;
        if (!ccThisData.planRefreshIntervalInHours) ccThisData.planRefreshIntervalInHours = 24;
        if (!ccThisData.lastExecutionTime) ccThisData.lastExecutionTime = getYesterdayDate();
        return ccThisData;
    }

    function initGlobalVariables(ccThisData) {
        totalNumberOfResources = ccThisData.numberOfResources;
        planRefreshIntervalInHours = ccThisData.planRefreshIntervalInHours;
        lastExecutionDate = ccThisData.lastExecutionTime;
        resources = [];
        numberOfNotExecutedResources = 0;
        resourcesAlerts = false;
    }

    function initView() {
        $('.deploy .messages').addClass('hidden');
        $('.deploy .pages').html('');
        $('#no-deploy-resources').addClass('hidden');
        $('.resources-list').html('');
        $('.resources-list').removeClass('empty');
        $('.resources-list-header').removeClass('empty');
    }

    function initClickHandlers() {
        $('.deploy .dropdown-button').click(function () {
            $('.deploy .custom-dropdown ul').toggleClass('hidden');
        });

        $(document).click(function (e) {
            if ($(e.target).closest('.deploy .custom-dropdown').length === 0) {
                $('.deploy .custom-dropdown ul').addClass('hidden');
            }
        });
        $('.resource-list-header .sort-label').click(function () {
            var _this = $(this);
            if (_this.hasClass('active')) {
                _this.toggleClass('desc');
            } else {
                $('.resource-list-header .active').removeClass('active');
                _this.addClass('active');
            }
            sort(_this.attr('key'), _this.hasClass('desc'));
        });
    }

    function init(data, sortKey, desc) {
        data = getInitializedCcThisData(data);
        isEnabled = data.isEnabled;
        initGlobalVariables(data);
        initView();
        initResourcesList(data.resourcesArray);
        sort(sortKey, desc);
    }

    function deploy(data) {
        init(data, 'timestamp', false);
        initClickHandlers();
    }

    deploy.prototype.renderResourcesList = sort;
    deploy.prototype.hasErrors = function () {
        return numberOfNotExecutedResources;
    };
    deploy.prototype.hasAlerts = function () {
        return resourcesAlerts;
    };
    deploy.prototype.getResourcesList = function () {
        return resources;
    };
    deploy.prototype.getResourcesWithError = function () {
        return resourceWithError;
    };
    deploy.prototype.refreshData = function (data) {
        var currentSort = $('.resource-list-header .sort-label');
        init(data, currentSort.attr('key'), currentSort.hasClass('desc'));
    };
    return deploy;
})();