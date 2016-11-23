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

    var externalActions = {
        redirectToCommunityComposites: 'redirectToCommunityComposites',
        showViolationMoreInfo: 'showViolationMoreInfo',
        showViolationResources: 'showViolationResources',
        shareViolation: 'shareViolation',
        showFullResourceData: 'showFullResourceData'
    };

    function getRegion(resource) {
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

    function renderMapData(sortKey) {
        var resources = deployData.getResourcesList();
        if (!resources) return;
        var mapData = {};
        resources.forEach(function (resource) {
            var region = getRegion(resource);
            if (!region) return;

            if (region !== 'CloudCoreo') {
                if (!mapData[region]) {
                    mapData[region] = { violations: 0, deployed: 0, message: defMessage };
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

    function emulateCcThisUpdate(data) {
        setTimeout(function() {
            d3.json("./tmp-data/tmp.json", function (data) {
                init(data, false);
            });
        }, 5000);
    }

    function init(data, isFirstLoad) {
        setupHandlers();
        d3.json("./tmp-data/world-countries.json", function (collection) {
            if (isFirstLoad) {
                deployData = new Deploy(data);
                auditData = new Audit(data.resourcesArray, 'level');
            } else {
                deployData.refreshData(data);
                auditData.refreshData(data.resourcesArray);
            }

            renderMapData('level');
            $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').removeClass('error');
            $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').removeClass('alert');

            var noViolations = !auditData.getViolationsList() || !auditData.getViolationsList().length;
            if (!noViolations) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');
            if (deployData.hasErrors()) $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('error');

            if(isFirstLoad) {
                currentView = noViolations ? viewTypes.deploy : viewTypes.audit;
                $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
                $('.' + currentView).removeClass('hidden');
                $('#backdrop').addClass('hidden');
            }
        });
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp2.json", function (data) {
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