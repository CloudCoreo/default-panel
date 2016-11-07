window.Deploy = (function () {
    var resources = [];
    var numberOfNotExecutedResources = 0;
    var resourcesAlerts = false;
    var initialData;

    var itemsOnPage = 2;
    var currentPage = 0;

    function renderResourcesList() {
        $('.resources-list').html('');
        //$('.resources-list').html('<pre>' + JSON.stringify(initialData, null, 4) + '</pre>');
        var rowTmpl = $.templates('#resource-row-tmpl');
        Object.keys(resources).forEach(function (resource) {
            var html = $(rowTmpl.render(resources[resource]));
            $('.resources-list').append(html);
            appendLogs(resources[resource].inputs, html.find('.logs .inputs'));
            appendLogs(resources[resource].outputs, html.find('.logs .outputs'));
        });
        initializeRowsActions();
        if (numberOfNotExecutedResources > 0) {
            appendNumberNotExecutedResourcesNotification();
        }
        if (resourcesAlerts) {
            appendResourcesAlertsNotifiacation();
        }
        if (numberOfNotExecutedResources <= 0 && !resourcesAlerts) {
            appendSuccessulBuildNotification();
        }
    }

    function initializeRowsActions() {
        $('.resources-list .resource-row .view-row').click(function (e) {
            $(this).next('.expandable-row').toggleClass('hidden');
        });
        $('.openInput').on('click', function (e) {
            openPopup('input');
        });
    }

    function appendLogs(data, appendTo) {
        Object.keys(data).forEach(function (key) {
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
        })
    }

    function appendNumberOfResultsLabel() {
        $('.resources-amount').html("SHOWING " +
            ((currentPage * itemsOnPage) || 1 ) + "-" +
            ((resources.length > itemsOnPage * (currentPage + 1)) ? itemsOnPage * (currentPage + 1) : resources.length) +
            " OF " +resources.length + ' results');

        var pages = resources.length / itemsOnPage;
        if(pages <= 1) return;

        $('.pages').append('<div class="page active prev"><<</div>');
        for(var i = 0; i < pages; ++i) {
            $('.pages').append('<div class="page' + (currentPage === i ? ' active' : '') + '">' + (i + 1) + '</div>');
        }
        $('.pages').append('<div class="page active next">>></div>');

        $('.pages').click(function () {
            var _this = $(this);
            if (_this.hasClass('next')) {
                ++currentPage;
            } else if (_this.hasClass('prev')) {
                --currentPage;
            } else {
                currentPage = _this.html();
            }
        });
    }

    function appendNumberNotExecutedResourcesNotification() {
        $('.error.messages').removeClass('hidden');
        $('.error.messages .message-left-part .message-status').html('ERROR');
        $('.error.messages .amount').html(numberOfNotExecutedResources);
    }

    function appendResourcesAlertsNotifiacation() {
        $('.alert.messages').removeClass('hidden');
    }

    function appendSuccessulBuildNotification() {
        $('.ok.messages').removeClass('hidden');
    }

    function sort(sortKey, isReverse, desc) {
        if (!resources) return;
        var sortedResources = resources.sort(function (a, b) {
            if(!desc) return a[sortKey] > b[sortKey] ? -1 : 1;
            return a[sortKey] > b[sortKey] ? 1 : -1;
        });
        resources = isReverse ? sortedResources : sortedResources.reverse();
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
            $('.resources-list').addClass('hidden');
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
            sort(_this.attr('sort'), !_this.hasClass('desc'), _this.hasClass('desc'));
        });

        sort('timestamp', false);
        appendNumberOfResultsLabel();
    }

    function deploy(data) {
        initResourcesList(data);
    }

    deploy.prototype.renderResourcesList = sort;
    deploy.prototype.getResourcesList = function () {
        return resources;
    };
    return deploy;
})();