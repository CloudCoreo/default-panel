$(document).ready(function () {
    var resourceWithError;
    var auditData;
    var deployData;
    var map;
    var isError;

    var viewTypes = {
        deploy: 'deploy',
        audit: 'audit',
        map: 'map'
    };

    var currentSortBy = {
        deploy: 'Most Recent',
        audit: 'Severity Level',
        map: ''
    };

    var currentView;
    var counter = 0;


    var externalActions = {
        redirectToCommunityComposites: 'redirectToCommunityComposites',
        showViolationMoreInfo: 'showViolationMoreInfo',
        showViolationResources: 'showViolationResources',
        shareViolation: 'shareViolation',
        showFullResourceData: 'showFullResourceData'
    };

    function getRegion(resource) {
        function getRegionValue() {
            var found = resource.inputs.find(function (elem) {
                return elem.name === 'region'
            });
            if (found) return found.value;
            return undefined;
        };

        if (resource.engineStatus.indexOf('ERROR') !== -1) return 'CloudCoreo';

        if (resource.resourceType.indexOf('coreo_aws_rule') !== -1 ||
            resource.resourceType.indexOf('coreo_uni_util') !== -1) return 'CloudCoreo';

        if (resource.resourceType.indexOf('aws_iam_') !== -1 ||
            resource.resourceType.indexOf('aws_route53_') !== -1) return 'AWS';

        if (resource.resourceType.indexOf('aws_ec2_') !== -1 ||
            resource.resourceType.indexOf('aws_elasticache_') !== -1 ||
            resource.resourceType.indexOf('aws_s3_') !== -1 ||
            resource.resourceType.indexOf('aws_vpc_') !== -1 ||
            resource.resourceType.indexOf('aws_vpn_') !== -1) {
            return getRegionValue();
        }
        return undefined;
    }

    function goToView(view) {
        if (currentView === view) return;
        $('.resource-type-toggle .resource-type').removeClass('active');
        $('.' + currentView).addClass('hidden');
        $('.' + view).removeClass('hidden');
        $('.resource-type.' + view + '-res').addClass('active');
        currentView = view;
    }

    function renderMapData(data) {
        var executionIsFinished =   data.engineState === 'COMPLETED' ||
                                    data.engineState === 'INITIALIZED' ||
                                    (data.engineState === 'PLANNED' && data.engineStatus !== 'OK');

        if (!executionIsFinished && !deployData.hasOldResources() && data.resourcesArray.length < data.numberOfResources) {
            staticMaps();
            return;
        }

        var resources = deployData.getResourcesList();
        if (!resources) return;
        var mapData = {};
        resources.forEach(function (resource) {
            var region = getRegion(resource);
            if (!region) return;

            if (region !== 'CloudCoreo') {
                if (!mapData[region]) {
                    mapData[region] = { violations: 0, deployed: 0, objects: 0 };
                }
                if (resource.dataType === 'ADVISOR_RESOURCE') ++mapData[region].violations;
                else ++mapData[region].deployed;
                return;
            }

            if (!mapData[region]) {
                mapData[region] = { violations: 0, deployed: 0, successMessage: 'Resource', errorMessage: 'Error' };
            }

            if (resource.engineStatus.indexOf('ERROR') !== -1) ++mapData[region].violations;
            else ++mapData[region].deployed;
        });

        var alerts = auditData.getViolationsList();
        if (alerts) {
            alerts.forEach(function (alert) {
                if (alert.resource.isSuppressed) return;
                var region = alert.region;
                if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0, objects: 0 };

                if (!alert.isViolation) ++mapData[region].objects;
                else ++mapData[region].violations;
            });
        }

        if (mapData.CloudCoreo) {
            if (mapData.CloudCoreo.violations > 1) mapData.CloudCoreo.errorMessage += 's';
            if (mapData.CloudCoreo.deployed > 1) mapData.CloudCoreo.successMessage += 's';
        }

        staticMaps(mapData);
    }

    function setupHandlers() {
        $('.resource-type-toggle .resource-type').click(function (e) {
            var view = $(this).attr('value');
            goToView(view);
        });

        $('.error-container-details').unbind().click(function (e) {
            var status = $('.error-container-status').attr('status');

            openPopup('showErrorModal', {
                status: status
            });
        });

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.warning-link').click(function () {
            var rowWithError = $('.resource-row .view-row .name:contains(' + resourceWithError.resourceName + ')').parent();
            rowWithError.next('.expandable-row').removeClass('hidden-row');
            goToView('deploy');
        });
    }

    function emulateCcThisUpdate() {
        setTimeout(function () {
            ++counter;
            if (counter > 3) return;
            d3.json("./tmp-data/tmp" + counter + ".json", function (data) {
                init(data, false);
                emulateCcThisUpdate();
            });
        }, 2000);
    }

    function initView() {
        $('.error-container').addClass('hidden');
        $('.engine-state').addClass('hidden');
        $('.data-is-loading').addClass('hidden');
        $('.resource-type-toggle').removeClass('hidden');
        $('.scrollable-area').removeClass('hidden');
        $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').removeClass('error');
        $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').removeClass('alert');
        $('.audit').removeClass('old-data-mask');
        $('.map').removeClass('old-data-mask');
    }

    function setupData(data, isFirstLoad) {
        var onLoad = function() {
            onDataProcessed(data, isFirstLoad);
        };
        if (isFirstLoad) {
            auditData = new Audit(data, 'level', onLoad);
            deployData = new Deploy(data);
            return;
        }
        auditData.refreshData(data, onLoad);
        deployData.refreshData(data);
    }

    function onDataProcessed(data, isFirstLoad) {
        if (deployData.hasOldResources()) {
            $('.audit').addClass('old-data-mask');
            $('.map').addClass('old-data-mask');
        }
        checkResourceError();
        checkRunError(data);
        setCurrentView(isFirstLoad);
        if (!isFirstLoad && data.engineState !== 'COMPLETED') return;

        renderMapData(data);
    }

    function setCurrentView(isFirstLoad) {
        var violationCount = 0;
        if (auditData) violationCount = auditData.getViolationsCount();
        if (violationCount) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');

        if (isFirstLoad) {
            if (currentView){
                $('.' + currentView).addClass('hidden');
                $('.resource-type-toggle .resource-type.' + currentView + '-res').removeClass('active');
            }
            currentView = !violationCount || isError ? viewTypes.deploy : viewTypes.audit;
            $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
            $('.' + currentView).removeClass('hidden');
        }
    }

    function getEngineStateMessage(engineState) {
        if (!engineState) return 'queued';
        return (engineState === "EXECUTING" || engineState === "COMPLETED") ? engineState : "COMPILING";
    }

    function appendNextExecutionTime() {
        var hoursTillNextExecution = deployData.accountAndGetHoursTillNextExecution();
        var nextExecutionTime = '';
        if (hoursTillNextExecution > 1) {
            nextExecutionTime = 'in ' + hoursTillNextExecution + ' hours';
        } else {
            nextExecutionTime = 'will start less than an hour';
        }
        $('.error-container .next-execution-time span').html(nextExecutionTime)
    }

    function countCurrentRunResourcesNumber(data) {
        var count = 0;
        if (!data.resourcesArray || !data.resourcesArray.length) return 0;
        data.resourcesArray.forEach( function (resource) {
            count += (resource.runId !== data.runId) ? 0 : 1;
        });
        return count;
    }
    
    function checkRunError(data) {
        isError = data.engineStatus === 'COMPILE_ERROR' ||
            data.engineStatus === 'INITIALIZATION_ERROR' ||
            data.engineStatus === 'PROVIDER_ERROR' ||
            data.engineStatus === 'EXECUTION_ERROR';

        if (isError || data.isMissingVariables) {
            var status = data.isMissingVariables ? 'MISSING_VARIABLES' : data.engineStatus;
            var date = new Date(data.lastExecutionTime);
            var lastExecutionTime = utils.formatDate(date);

            $('.error-container-status').text(status.replace('_', ' '));
            $('.error-container-status').attr('status', status);
            $('.error-container').removeClass('hidden');
            $('.last-successful-run span').html(lastExecutionTime);

            appendNextExecutionTime();
        }
    }

    function setExecutionStatusMessage(data) {
        if (data.engineState === 'COMPLETED' || data.engineState === 'INITIALIZED') return;

        $('.engine-state').removeClass('hidden');
        $('.engine-state .message').html(getEngineStateMessage(data.engineState));

        if (!data.resourcesArray && data.engineState !== 'EXECUTING') {
            $('.data-is-loading').removeClass('hidden');
            $('.resource-type-toggle').addClass('hidden');
            $('.scrollable-area').addClass('hidden');
            $('.engine-state .status-spinner').css('width', '0%');
            return;
        }

        var loadedResourcesPercentage = 0;
        if (data.numberOfResources && data.engineState === 'EXECUTING') {
            loadedResourcesPercentage = countCurrentRunResourcesNumber(data) * 100 / data.numberOfResources;
        }
        $('.engine-state .status-spinner').css('width', loadedResourcesPercentage + '%');
    }

    function checkResourceError() {
        if (deployData.hasErrors()) {
            $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('error');
            resourceWithError = deployData.getResourcesWithError();
            $('.warning-block').removeClass('hidden');
            $('.Disabled').addClass('hidden');
            $('.Enabled').addClass('hidden');
        }

        var alerts = auditData.getViolationsList();
        if (alerts && !alerts.length) $('.warning-note-2').addClass('hidden');
    }

    function init(data, isFirstLoad) {
        setupHandlers(data);
        initView();
        setupData(data, isFirstLoad);
        setExecutionStatusMessage(data);
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp1.json", function (data) {
            init(data, true);
            // emulateCcThisUpdate(data);
        });
    } else {
        init(ccThisCont.ccThis, true);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue, false);
        });
    }
});