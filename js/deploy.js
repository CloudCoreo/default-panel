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
    var hasOldResources = false;

    var resourcesFlag = {};

    function initResourcesList(ccthis) {
        var ccThisData = ccthis.resourcesArray;
        initialData = ccThisData;
        var resource = {};
        ccThisData.forEach(function (data, index) {
            Object.keys(data).forEach(function (resourceData) {
                var resourceProperty = data[resourceData];
                if (resourceData == 'engineStatus') {
                    if (resourceProperty == 'OK') {
                        resource.engineStatus = constants.ENGINE_STATUSES.SUCCESS;
                        resource.engineStatusClass = 'stable-status';
                    } else {
                        resource.engineStatusClass = 'error-status';
                        resource.engineStatus = constants.ENGINE_STATUSES.ERROR;

                        var isCurrentError = data.runId === ccthis.runId;
                        var showPreviousData = ccthis.engineState === constants.ENGINE_STATES.INITIALIZED ||
                                (ccthis.engineState === constants.ENGINE_STATES.PLANNED &&
                                ccthis.engineStatus !== constants.ENGINE_STATUSES.OK);

                        if (isCurrentError || (showPreviousData && !isCurrentError)) {
                            numberOfFailedResource = data.executionNumber;
                            numberOfNotExecutedResources++;
                            resourceWithError = resource;
                        }
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
                    resource.formattedTimestamp = utils.formatDate(resourceProperty);
                    resource[resourceData] = resourceProperty;
                } else if (resourceData == 'executionTime') {
                    resource.executionTime = utils.formatTime(resourceProperty);
                } else {
                    resource[resourceData] = resourceProperty;
                }
            });
            resource.isOld = resource.runId !== ccthis.runId;
            if (resource.isOld && ccthis.engineState === constants.ENGINE_STATES.COMPLETED &&
                ccthis.engineStatus === constants.ENGINE_STATUSES.OK) {
                ccThisData.slice(index, index);
                return;
            }

            if (resource.isOld) hasOldResources = true;
            resources.push(resource);
            resource = {};
        });

        if (!resources.length) {
            $('#no-deploy-resources').removeClass('hidden');
            $('.resources-list').addClass('empty');
            $('.resources-list-header').addClass('empty');
            return;
        }
    }

    function getInitializedCcThisData(ccThisData) {
        if (!ccThisData.resourcesArray) ccThisData.resourcesArray = [];
        if (!ccThisData.numberOfResources) ccThisData.numberOfResources = 0;
        if (!ccThisData.planRefreshIntervalInHours) ccThisData.planRefreshIntervalInHours = 24;
        return ccThisData;
    }

    function initGlobalVariables(ccThisData) {
        totalNumberOfResources = ccThisData.numberOfResources;
        planRefreshIntervalInHours = ccThisData.planRefreshIntervalInHours;
        resources = [];
        numberOfNotExecutedResources = 0;
        resourcesAlerts = false;
    }

    function initView() {
        $('.deploy .messages').addClass('hidden');
        $('.deploy .pages').html('');
        $('#no-deploy-resources').addClass('hidden');
        $('.resources-list').html('').removeClass('empty');
        $('.resources-list-header').removeClass('empty');
    }

    function deploy(data) {
        initResourcesList(data);
    }

    deploy.prototype.getResourcesList = function () {
        return resources;
    };

    deploy.prototype.refreshData = function (data) {
        var currentSort = $('.resource-list-header .sort-label.active');
        hasOldResources = false;
        initResourcesList(data);
    };

    deploy.prototype.hasOldResources = function() {
        return hasOldResources;
    };
    return deploy;
})();