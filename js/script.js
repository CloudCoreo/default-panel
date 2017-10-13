$(document).ready(function () {
    window.isLocalRun = typeof ccThisCont === 'undefined';

    var auditData;
    var deployData;
    var map;

    var viewTypes = {
        audit: Constants.VIEW_TYPE.AUDIT,
        map: Constants.VIEW_TYPE.MAP
    };

    var currentView;
    var counter = 0;
    var MAX_COUNTER;

    var templates = Constants.TEMPLATE_IDS;

    function parseQueries(queryString) {
        var parsedQueries = {};
        var queries = [];

        if (!queryString) return parsedQueries;

        queries = queryString.split('&');

        queries.forEach(function(query) {
            query = query.split('=');
            parsedQueries[query[0]] = query[1];
        });

        return parsedQueries;
    }

    var queryString = window.location.href.split('?');
    window.parsedQueries = parseQueries(queryString[1]);

    function getRegion(resource) {
        function getRegionValue() {
            var found = resource.inputs.find(function (elem) {
                return elem.name === 'region'
            });
            if (found) return found.value;
            return undefined;
        }

        if (resource.engineStatus.indexOf(Constants.ENGINE_STATUSES.ERROR) !== -1) return Constants.REGIONS.CLOUDCOREO;

        if (resource.resourceType.indexOf(Constants.SERVICES.COREO_AWS_RULE) !== -1 ||
            resource.resourceType.indexOf(Constants.SERVICES.COREO_UNI_UTIL) !== -1) return Constants.REGIONS.CLOUDCOREO;

        if (resource.resourceType.indexOf(Constants.SERVICES.AWS_IAM) !== -1 ||
            resource.resourceType.indexOf(Constants.SERVICES.AWS_ROUTE53) !== -1) return Constants.REGIONS.AWS;

        if (resource.resourceType.indexOf(Constants.SERVICES.AWS_EC2) !== -1 ||
            resource.resourceType.indexOf(Constants.SERVICES.AWS_ELASTICACHE) !== -1 ||
            resource.resourceType.indexOf(Constants.SERVICES.AWS_S3) !== -1 ||
            resource.resourceType.indexOf(Constants.SERVICES.AWS_VPC) !== -1 ||
            resource.resourceType.indexOf(Constants.SERVICES.AWS_VPN) !== -1) {
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
        var executionIsFinished =   data.engineState === Constants.ENGINE_STATES.COMPLETED ||
                                    data.engineState === Constants.ENGINE_STATES.INITIALIZED ||
                                    (data.engineState === Constants.ENGINE_STATES.PLANNED &&
                                    data.engineStatus !== Constants.ENGINE_STATUSES.OK);

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

            if (region !== Constants.REGIONS.CLOUDCOREO) {
                if (!mapData[region]) {
                    mapData[region] = { violations: 0, deployed: 0, objects: 0 };
                }
                if (resource.dataType === Constants.RESOURCE_TYPE.ADVISOR_RESOURCE) ++mapData[region].violations;
                else ++mapData[region].deployed;
                return;
            }

            if (!mapData[region]) {
                mapData[region] = { violations: 0, deployed: 0, successMessage: 'Resource', errorMessage: 'Error' };
            }

            if (resource.engineStatus.indexOf(Constants.ENGINE_STATUSES.ERROR) !== -1) ++mapData[region].violations;
            else ++mapData[region].deployed;
        });

        var alerts = auditData.getViolationsList();
        if (alerts) {
            alerts.forEach(function (alert) {
                if (!alert.resource || alert.resource.isSuppressed) return;
                var region = alert.region;
                if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0, objects: 0 };

                if (!alert.include_violations_in_count) ++mapData[region].objects;
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
        $('.resource-type-toggle .resource-type').click(function () {
            var view = $(this).attr('value');
            goToView(view);
        });

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.warning-link').click(function () {
            openPopup(Constants.POPUPS.REDIRECT_TO_RESOURCES);
        });

        $('#view-run-error').click(function () {
            openPopup(Constants.POPUPS.SHOW_ERROR);
        });
    }

    function emulateCcThisUpdate() {
        setTimeout(function () {
            ++counter;
            if (counter > MAX_COUNTER) {
                return;
            }
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
        var onAditDataError = function () {
            setCurrentView(isFirstLoad);
        };
        var onLoad = function() {
            onDataProcessed(data, isFirstLoad);
        };
        if (isFirstLoad) {
            auditData = new Audit(data, Constants.SORTKEYS.level.name, onLoad, onAditDataError);
            deployData = new Deploy(data);
            return;
        }
        auditData.refreshData(data, onLoad);
        deployData.refreshData(data);
    }

    function onDataProcessed(data, isFirstLoad) {
        if (deployData.hasOldResources() || auditData.hasOldResources()) {
            $('.audit').addClass('old-data-mask');
            $('.map').addClass('old-data-mask');
        }
        setCurrentView(isFirstLoad);

        if (!isFirstLoad && data.engineState !== Constants.ENGINE_STATES.COMPLETED) return;
        renderMapData(data);
    }

    function setCurrentView(isFirstLoad) {
        var violationCount = 0;
        if (auditData) violationCount = auditData.getViolationsCount();
        if (violationCount) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');

        if (isFirstLoad && !currentView) {
            currentView = viewTypes.audit;
            $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
            $('.' + currentView).removeClass('hidden');
        }
    }

    function getEngineStateMessage(engineState) {
        if (!engineState) return 'queued';
        return (engineState === Constants.ENGINE_STATES.EXECUTING ||
                engineState === Constants.ENGINE_STATES.COMPLETED) ? engineState : Constants.ENGINE_STATES.COMPILING;
    }

    function setExecutionStatusMessage(data) {
        if (data.engineState === Constants.ENGINE_STATES.COMPLETED || data.engineState === Constants.ENGINE_STATES.INITIALIZED) return;

        $('.engine-state').removeClass('hidden');
        $('.engine-state .message').html(getEngineStateMessage(data.engineState));

        if (!data.resourcesArray && data.engineState !== Constants.ENGINE_STATES.EXECUTING) {

            $('.data-is-loading').removeClass('hidden');
            $('.resource-type-toggle').addClass('hidden');
            $('.scrollable-area').addClass('hidden');
            $('.options-container').css({border: 'none'});
        } else {
            $('.options-container').css({'border-bottom': '1px solid #e4e4e4'});
        }
    }

    function showErrorBlock(params) {
        var errorContainter = $.templates(templates.ERROR_BLOCK);
        var rendered = errorContainter.render({
            timestamp: utils.formatDate(params.timestamp),
            engineStatus: params.engineStatus,
            runId: params.runId
        });
        $('.run-error-wrapper').append(rendered);
    }

    function checkError(ccThis) {
        var params = {
            timestamp: ccThis.lastExecutionTime
        };
        if (ccThis.engineStatus.indexOf('ERROR') !== -1) showErrorBlock(params);
    }

    function init(data, isFirstLoad) {
        console.log('init');
        console.log(data);
        checkError(data);
        setupHandlers(data);
        initView();
        setupData(data, isFirstLoad);
        setExecutionStatusMessage(data);
    }

    if (window.isLocalRun) {
        if (!window.parsedQueries.tmpfile) {
            console.log('Please add tmpFile in url params', 'example: ?tmpfile=./tmp-data/tmp0.json');
            return;
        }

        d3.json(window.parsedQueries.tmpfile, function (data) {

            init(data, true);
            if (window.parsedQueries.emulateUpdate) {
                MAX_COUNTER = window.parsedQueries.emulationCounter || 2;
                emulateCcThisUpdate(data)
            }
        });
    } else {
        init(ccThisCont.ccThis, true);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue, false);
        });
    }
});