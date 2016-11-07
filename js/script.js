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

    var currentView = viewTypes.deploy;

    function getRegion(resource) {
        if (resource.resourceType.indexOf('aws_advisor_alert') !== -1) return 'CloudCoreo';
        if (resource.resourceType.indexOf('aws_iam_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('aws_route53_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('uni_util_') !== -1) return 'CloudCoreo';

        return undefined;
    }

    function renderMapData(sortKey) {
        var resources = deployData.getResourcesList();
        if (!resources) return;
        var mapData = {};

        resources.forEach(function (resource) {
            var region = getRegion(resource);
            if(!region) return;

            if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0};
            if (resource.dataType === 'ADVISOR_RESOURCE') ++mapData[region].violations;
            else ++mapData[region].deployed;
        });

        var alerts = auditData.getViolationsList();
        alerts.forEach(function (alert) {
            var region = alert.region;
            if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0};
            ++mapData[region].violations;
        });

        staticMaps(mapData);
    }

    function setupHandlers() {
        $('.custom-radio-btns-group .custom-radio-button').click(function (e) {
            var inputValue = $(this).find('input').val();
            if (currentView === inputValue) return;
            $('.' + currentView).addClass('hidden');
            $('.' + inputValue).removeClass('hidden');
            currentView = inputValue;

            if (currentView === 'map') {
                $('.custom-dropdown').hide();
            } else {
                $('.custom-dropdown').show();
                $('.custom-dropdown .chosen-item-text').html(currentSortBy[currentView]);
            }

            if (inputValue) {
                $(this).addClass('active').siblings().removeClass('active');
            }
        });

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });
    }

    function showLocalPopup() {
        $('#popup').removeClass('hidden');
    }

    function init(data) {
        setupHandlers();
        d3.json("./tmp-data/world-countries.json", function (collection) {
            //map = new ResourcesMap(collection, '.map-cont');
            deployData = new Deploy(data);
            auditData = new Audit(data, 'level');

            renderMapData('level');

            $('#backdrop').addClass('hidden');
        });
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp.json", function (data) {
            init(data)
        });
    } else {
        init(ccThisCont.ccThis);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue);
        });
    }
});