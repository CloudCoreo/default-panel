$(document).ready(function () {
    var resourceWithError;
    var auditData;
    var deployData;
    var map;

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
        if (resource.engineStatus.indexOf('ERROR') !== -1) return 'CloudCoreo';
        if (resource.resourceType.indexOf('aws_advisor_') !== -1) return 'CloudCoreo';
        if (resource.resourceType.indexOf('aws_iam_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('aws_route53_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('uni_util_') !== -1) return 'CloudCoreo';

        if (resource.resourceType.indexOf('aws_ec2_') !== -1 ||
            resource.resourceType.indexOf('aws_elasticache_') !== -1 ||
            resource.resourceType.indexOf('aws_s3_') !== -1 ||
            resource.resourceType.indexOf('aws_vpc_') !== -1 ||
            resource.resourceType.indexOf('aws_vpn_') !== -1) {
            var found = resource.inputs.find(function (elem) {
                return elem.name === 'region'
            });
            if (found) return found.value;
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

    function removeSplitters() {
        var warningBlock2 =  $('.warning-note-2');
        warningBlock2.removeClass('visible');
        $('.violation-divider').remove();
    }

    function renderMapData(data) {
        if (data.engineState != 'COMPLETED' && data.resourcesArray.length !== data.numberOfResources) {
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
                    mapData[region] = { violations: 0, deployed: 0 };
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
                if (!alert.isViolation) return;
                var region = alert.region;
                if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0 };
                ++mapData[region].violations;
            });
        }

        if (mapData.CloudCoreo) {
            if (mapData.CloudCoreo.violations > 1) mapData.CloudCoreo.errorMessage += 's';
            if (mapData.CloudCoreo.deployed > 1) mapData.CloudCoreo.successMessage += 's';
        }

        if (!alerts.length) removeSplitters();

        staticMaps(mapData);
    }

    function setupHandlers() {
        $('.resource-type-toggle .resource-type').click(function (e) {
            var view = $(this).attr('value');
            goToView(view);
        });

        $('.compile-error-details').click(function (e) {
            openPopup('showCompileErrorModal', {});
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
        $('.compile-error').addClass('hidden');
        $('.engine-state').addClass('hidden');
        $('.data-is-loading').addClass('hidden');
        $('.resource-type-toggle').removeClass('hidden');
        $('.scrollable-area').removeClass('hidden');
        $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').removeClass('error');
        $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').removeClass('alert');
    }

    function setupData(data, isFirstLoad) {
        if (isFirstLoad) {
            deployData = new Deploy(data);
            auditData = new Audit(data, 'level');
        } else {
            deployData.refreshData(data);
            auditData.refreshData(data);
        }
        checkError();
        renderMapData(data);
    }

    function setupViewData(isFirstLoad) {
        var violationCount = auditData.getViolationsCount();

        if (violationCount) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');
        if (isFirstLoad) {
            currentView = !violationCount ? viewTypes.deploy : viewTypes.audit;
            $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
            $('.' + currentView).removeClass('hidden');
        }
    }

    function getEngineStateMessage(engineState) {
        if (!engineState) return 'queued';
        return engineState.replace('_', ' ');
    }

    function appendNextExecutionTime() {
        var hoursTillNextExecution = deployData.accountAndGetHoursTillNextExecution();
        var nextExecutionTime = '';
        if (hoursTillNextExecution > 1) {
            nextExecutionTime = 'in ' + hoursTillNextExecution + ' hours';
        } else {
            nextExecutionTime = 'will start less than an hour';
        }
        $('.compile-error .next-execution-time span').html(nextExecutionTime)
    }

    function countCurrentRunResourcesNumber(data) {
        var count = 0;
        if (!data.resourcesArray || !data.resourcesArray.length) return 0;
        data.resourcesArray.forEach( function (resource) {
            count += (resource.runId !== data.runId) ? 0 : 1;
        });
        return count;
    }
    
    function setExecutionStatusMessage(data) {
        if (data.engineStatus === 'COMPILE_ERROR' || data.engineStatus === 'INITIALIZATION_ERROR') {
            var date = new Date(data.lastExecutionTime);
            var lastExecutionTime = utils.formatDate(date);

            $('.error-state').text(data.engineStatus.replace('_', ' '));
            $('.compile-error').removeClass('hidden');
            $('.last-successful-run span').html(lastExecutionTime);

            appendNextExecutionTime();
            return;
        }

        if (data.engineState === 'COMPLETED' || data.engineState === 'INITIALIZED') return;

        $('.engine-state').removeClass('hidden');
        $('.engine-state .message').html(getEngineStateMessage(data.engineState));

        if (!data.resourcesArray && data.engineState !== 'EXECUTING') {
            $('.data-is-loading').removeClass('hidden');
            $('.resource-type-toggle').addClass('hidden');
            $('.scrollable-area').addClass('hidden');
            return;
        }

        var loadedResourcesPercentage = 0;
        if (data.numberOfResources) {
            loadedResourcesPercentage = countCurrentRunResourcesNumber(data) * 100 / data.numberOfResources;
        }
        $('.engine-state .status-spinner').css('width', loadedResourcesPercentage + '%');
    }

    function checkError() {
        var warningBlock = $('.warning-block');
        warningBlock.removeClass('visible');

        if (deployData.hasErrors()) {
            $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('error');
            resourceWithError = deployData.getResourcesWithError();
            warningBlock.addClass('visible');
            $('.Disabled').addClass('hidden');
            $('.Enabled').addClass('hidden');
        }
    }

    function init(data, isFirstLoad) {
        setupHandlers(data);
        initView();
        setupData(data, isFirstLoad);
        setExecutionStatusMessage(data);
        setupViewData(isFirstLoad);
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