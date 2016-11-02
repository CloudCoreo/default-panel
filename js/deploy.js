window.Deploy = (function () {
    var resources = [];
    var numberOfNotExecutedResources = 0;
    var resourcesAlerts = false;
    var initialData;

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
        appendNumberOfResultsLabel();
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
        $('.resources-amount').html(resources.length + ' results');
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
                    resource.timestamp = utils.formatDate(resourceProperty);
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
        sort('resource_timestamp', false);
    }

    function deploy(data) {
        initResourcesList(data);
    }

    deploy.prototype.renderResourcesList = sort;
    return deploy;
})();