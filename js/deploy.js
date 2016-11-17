window.Deploy = (function () {
    var resources = [];
    var numberOfNotExecutedResources = 0;
    var resourcesAlerts = false;
    var initialData;

    var itemsOnPage = 50;
    var currentPage = 0;

    function renderResourcesList() {
        $('.deploy .sort-label.mobile').click(function(){
            var _this = $(this);
            var label = _this.text();
            $(".deploy .chosen-item-text").text(label);
            _this.parent().addClass('hidden');
        });
        $('.resources-list').html('');
        var rowTmpl = $.templates('#resource-row-tmpl');
        for(var i = currentPage * itemsOnPage; i < (currentPage + 1) * itemsOnPage && i < resources.length; ++i) {
            var html = $(rowTmpl.render(resources[i]));
            $('.resources-list').append(html);
            appendLogs(resources[i].inputs, html.find('.logs .inputs .data-cont'));
            appendLogs(resources[i].outputs, html.find('.logs .outputs .data-cont'));
        }
        initializeRowsActions();
    }

    function initializeRowsActions() {
        $('.resources-list .resource-row .view-row').click(function (e) {
            $(this).next('.expandable-row').toggleClass('hidden');
        });
        $('.openInputs').on('click', function (e) {
            var resId = $(this).attr('resource');
            openPopup('showFullResourceData', resId);
        });
    }

    function appendLogs(data, appendTo) {
        var count = 0;
        Object.keys(data).some(function (key) {
            ++count;
            var inputOutputRecordHtml = '';
            if (data[key].name == 'error') {
                appendTo.find('.label').hide();
                var errorTpl = $.templates('#error-tpl');
                inputOutputRecordHtml = $(errorTpl.render(data[key].value));
            }
            else {
                var parsed = JSON.parse(JSON.stringify(data[key].value));
                if (typeof data[key].value !== 'string') {
                    parsed = JSON.stringify(parsed);
                }
                inputOutputRecordHtml = '<div class="input-record">' + data[key].name + ': <span>' + parsed + '</span></div>';
            }
            appendTo.append(inputOutputRecordHtml);
            if (appendTo.html().length > 1500 || count >= 11) {
                appendTo.parent().find('.view-more').removeClass('hidden');
                return true;
            }
            return false;
        })
    }

    function appendNumberOfResultsLabel() {
        $('.resources-amount').html("SHOWING " +
            ((currentPage * itemsOnPage) || 1 ) + "-" +
            ((resources.length > itemsOnPage * (currentPage + 1)) ? itemsOnPage * (currentPage + 1) : resources.length) +
            " OF " +resources.length + ' results');

        var pages = resources.length / itemsOnPage;
        if (pages <= 1) return;

        $('.pages').append('<div class="page active prev"><<</div>');
        for(var i = 0; i < pages; ++i) {
            $('.pages').append('<div value="'+ i +'" class="page' + (currentPage === i ? ' active' : '') +' value' + i + '">' + (i + 1) + '</div>');
        }
        $('.pages').append('<div class="page active next">>></div>');

        $('.page').click(function () {
            var _this = $(this);
            var newPage;

            if (_this.hasClass('next') && currentPage + 1 < pages) {
                newPage = currentPage + 1;
            } else if (_this.hasClass('prev') && currentPage - 1 >= 0) {
                newPage = currentPage - 1;
            } else if (_this.attr('value')){
                newPage = _this.attr('value')*1.0;
            }

            if (typeof newPage === "undefined" || currentPage === newPage) {
                return;
            }

            $('.page.value'+currentPage).removeClass('active');
            $('.page.value'+newPage).addClass('active');
            currentPage = newPage;

            renderResourcesList();
        });
    }

    function appendNumberNotExecutedResourcesNotification() {
        $('.error.messages').removeClass('hidden');
        $('.error.messages .message-left-part .message-status').html('ERROR');
        $('.error.messages .amount').html(numberOfNotExecutedResources);
    }

    function appendResourcesAlertsNotification() {
        $('.alert.messages').removeClass('hidden');
    }

    function appendSuccessulBuildNotification() {
        $('.ok.messages').removeClass('hidden');
    }

    function sort(sortKey, desc) {
        if (!resources) return;
        var sortedResources = resources.sort(function (a, b) {
            if(!desc) return a[sortKey] > b[sortKey] ? -1 : 1;
            return a[sortKey] > b[sortKey] ? 1 : -1;
        });
        resources = sortedResources;
        renderResourcesList();
    }

    function initResourcesList(dataList) {
        initialData = dataList;
        var resource = {};
        dataList.forEach(function (data) {
            Object.keys(data).forEach(function (resourceData) {
                var resourceProperty = data[resourceData];
                if (resourceData == 'engineStatus') {
                    if (resourceProperty == 'OK') {
                        resource.engineStatus = 'SUCCESS';
                        resource.engineStatusClass = 'stable-status';
                    }
                    else {
                        resource.engineStatusClass = 'error-status';
                        resource.engineStatus = 'ERROR';
                        numberOfNotExecutedResources++;
                    }
                }
                else if (resourceData == 'inputs') {
                    for (var i = 0; i < resourceProperty.length; i++) {
                        if (resourceProperty[i].name == 'action') {
                            resource.action = resourceProperty[i].value;
                            break;
                        }
                    }
                    resource[resourceData] = resourceProperty;
                }
                else if (resourceData == 'timestamp') {
                    resource.timestamp = utils.formatDate(resourceProperty);
                }
                else if (resourceData == 'executionTime') {
                    resource.executionTime = utils.formatTime(resourceProperty);
                }
                else {
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

        $('.resource-list-header .sort-label').click( function () {
            var _this = $(this);
            if(_this.hasClass('active')) {
                _this.toggleClass('desc');
            } else {
                $('.resource-list-header .active').removeClass('active');
                _this.addClass('active');
            }
            sort(_this.attr('key'), _this.hasClass('desc'));
        });

        sort('timestamp');
        appendNumberOfResultsLabel();

        if (numberOfNotExecutedResources > 0) {
            appendNumberNotExecutedResourcesNotification();
        }
        if (resourcesAlerts) {
            appendResourcesAlertsNotification();
        }
        if (numberOfNotExecutedResources <= 0 && !resourcesAlerts) {
            appendSuccessulBuildNotification();
        }
        $('.deploy .dropdown-button').click(function () {
            $('.deploy .custom-dropdown ul').toggleClass('hidden');
        });
    }

    function deploy(data) {
        $('.deploy .messages').addClass('hidden');
        $('.deploy .pages').html('');
        $('#no-deploy-resources').addClass('hidden');
        $('.resources-list').removeClass('empty');
        $('.resources-list-header').removeClass('empty');
        initResourcesList(data);
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
    return deploy;
})();