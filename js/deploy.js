window.deploy = (function () {
    var resources = [];
    var numberOfNotExecutedResources = 0;
    var initialData;

    function renderResourcesList() {
        // $('.resources-list').html('');
        //$('.resources-list').html('<pre>' + JSON.stringify(initialData, null, 4) + '</pre>');
        var rowTmpl = $.templates('#resource-row-tmpl');
        Object.keys(resources).forEach(function (resource) {
            var html = $(rowTmpl.render(resources[resource]));
            $('.resources-list').append(html);
            appendLogs(resources[resource].inputs, html.find('.logs .inputs'));
            appendLogs(resources[resource].outputs, html.find('.logs .outputs'));
        });
        appendNumberOfResultsLabel();
        initializeRowsActions();
        if (numberOfNotExecutedResources > 0) {
            appendNumberNotExecutedResources();
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

    function formatDate(date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear(),
            hour = d.getHours(),
            minute = d.getMinutes(),
            seconds = d.getSeconds();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        if (hour.length < 2) hour = '0' + hour;
        if (minute.length < 2) minute = '0' + minute;
        if (seconds.length < 2) seconds = '0' + seconds;

        return [day, month, year].join('/') + ' ' + [hour, minute, seconds].join(':');
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
        $('.resources-amount').html(resources.length + ' results');
    }

    function appendNumberNotExecutedResources() {
        $('.alerts.messages').removeClass('hidden');
        $('.alerts.messages .amount').html(numberOfNotExecutedResources);
    }

    function sortResourcesByResourceType(isReverse) {
        if (!resources) return;
        var sortedResources = resources.sort(function (a, b) {
            return a.resourceType > b.resourceType ? 1 : -1;
        });
        return isReverse ? sortedResources : sortedResources.reverse();
    }

    function sortResourcesByResourceTimestamp(isReverse) {
        if (!resources) return;
        var sortedResources = resources.sort(function (a, b) {
            return a.timestamp > b.timestamp ? 1 : -1;
        });
        return isReverse ? sortedResources : sortedResources.reverse();
    }

    function sortResourcesByAction(isReverse) {
        if (!resources) return;
        var sortedResources = resources.sort(function (a, b) {
            return a.action > b.action ? 1 : -1;
        });
        return isReverse ? sortedResources : sortedResources.reverse();
    }

    function sortResourcesByStatus(isReverse) {
        if (!resources) return;
        var sortedResources = resources.sort(function (a, b) {
            return a.engineStatus > b.engineStatus ? 1 : -1;
        });
        return isReverse ? sortedResources : sortedResources.reverse();
    }

    var sortValues = {
        resource_type: sortResourcesByResourceType,
        resource_timestamp: sortResourcesByResourceTimestamp,
        action: sortResourcesByAction,
        status: sortResourcesByStatus,
    }

    function sort(sortKey, isReverse) {
        resources = sortValues[sortKey](isReverse);
        renderResourcesList();
    }

    function initResourcesList(dataList) {
        initialData = dataList;
        var resource = {};
        dataList.forEach(function (data) {
            if (data.dataType !== 'DEPLOY_RESOURCE') return;

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
                    resource.timestamp = formatDate(resourceProperty);
                }
                else {
                    resource[resourceData] = resourceProperty;
                }
            });
            resources.push(resource);
            resource = {};
        });
        sort('resource_timestamp', false);
    }

    function deploy(data) {
        initResourcesList(data);
    }

    deploy.prototype.renderResourcesList = sort;
    return deploy;
})();