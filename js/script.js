$(document).ready(function () {
    var auditData;
    var deployData;
    var map;

    var viewTypes = {
        audit: 'audit',
        map: 'map'
    };

    var currentSortBy = {
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
        }

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

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
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
        }, 3000);
    }

    function initView() {
        $('.data-is-loading').addClass('hidden');
        $('.resource-type-toggle').removeClass('hidden');
        $('.scrollable-area').removeClass('hidden');
        $('.resource-type-toggle .resource-type.audit-res').removeClass('alert');
        $('.audit').removeClass('old-data-mask');
        $('.map').removeClass('old-data-mask');
        currentView = 'audit';
    }

    function setupData(data, isFirstLoad) {
        if (isFirstLoad) {
            auditData = new Audit(data, 'level');
            deployData = new Deploy(data);
        } else {
            auditData.refreshData(data);
            deployData.refreshData(data);
        }

        if (deployData.hasOldResources()) {
            $('.audit').addClass('old-data-mask');
            $('.map').addClass('old-data-mask');
        }

        if (!isFirstLoad && data.engineState !== 'COMPLETED') return;
        renderMapData(data);
    }

    function setupViewData(isFirstLoad) {
        const violationCount = auditData.getViolationsCount();
        const $audit = $('.resource-type-toggle .resource-type.audit-res');
        if (violationCount) $audit.addClass('alert');
        $audit.addClass('active')
            .removeClass('hidden');
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
        if (data.engineState === 'EXECUTING') {
            $('.data-is-loading').removeClass('hidden');
            $('.resource-type-toggle').addClass('hidden');
            $('.scrollable-area').addClass('hidden');
            $('.options-container').css({border: 'none'});
        } else {
            $('.options-container').css({'border-bottom': '1px solid #e4e4e4'});
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