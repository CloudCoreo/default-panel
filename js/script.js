$(document).ready(function () {
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

        staticMaps(mapData);
    }

    function setupHandlers() {
        $('.resource-type-toggle .resource-type').click(function (e) {
            var inputValue = $(this).attr('value');
            if (currentView === inputValue) return;
            $('.' + currentView).addClass('hidden');
            $('.' + inputValue).removeClass('hidden');
            currentView = inputValue;

            if (inputValue) {
                $('.resource-type-toggle .resource-type').removeClass('active');
                $(this).addClass('active');
            }
        });

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });
    }

    function emulateCcThisUpdate() {
        setTimeout(function() {
            ++counter;
            if (counter > 3) return;
            d3.json("./tmp-data/tmp"+counter+".json", function (data) {
                init(data, false);
                emulateCcThisUpdate();
            });
        }, 2000);
    }

    function initView() {
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
        renderMapData(data);
    }

    function setupViewData(isFirstLoad) {
        var violationCount = auditData.getViolationsCount();
        if (violationCount) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');
        if (deployData.hasErrors()) $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('error');

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

    function setExecutionStatusMessage(data) {
        if (data.engineState === 'COMPLETED') return;

        $('.engine-state').removeClass('hidden');
        $('.engine-state .message').html(getEngineStateMessage(data.engineState));

        if (!data.resourcesArray || data.engineState === 'COMPILING') {
            $('.data-is-loading').removeClass('hidden');
            $('.resource-type-toggle').addClass('hidden');
            $('.scrollable-area').addClass('hidden');
            return;
        }
        var loadedResourcesPercentage = data.resourcesArray.length * 100 / data.numberOfResources;
        $('.engine-state .status-spinner').css('width', loadedResourcesPercentage + '%');
    }

    function init(data, isFirstLoad) {
        setupHandlers();
        initView();
        setExecutionStatusMessage(data);
        setupData(data, isFirstLoad);
        setupViewData(isFirstLoad);
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp0.json", function (data) {
            init(data, true);
            emulateCcThisUpdate(data);
        });
    } else {
        init(ccThisCont.ccThis, true);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue, false);
        });
    }
});