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

    function renderMapData(sortKey) {
        var alerts = auditData.getViolationsList();
        if (!alerts) return;

        var color = auditData.getColors();
        var mapData = {};

        alerts.forEach(function (alert) {
            var key = alert[sortKey];

            if (!mapData[alert.region]) mapData[alert.region] = {};
            if (!mapData[alert.region][key])  mapData[alert.region][key] = { value: 0, color: color[key] };
            ++mapData[alert.region][key].value;
        });

        map.drawCirclesOnMap(mapData);
        map.drawMapHistory(mapData, '.map-history');
    }

    function setupHandlers() {
        $('#chosen-sorting').change(function () {
            var sortBy = $(this).val();
            var isReverse = $('.chosen-item-is-reverse').val() === 'true';

            if (currentView === viewTypes.deploy) deployData.renderResourcesList(sortBy, isReverse);
            if (currentView === viewTypes.audit) auditData.renderResourcesList(sortBy);
        });

        $('.dropdown-button').click(function () {
            $('.custom-dropdown ul.' + currentView).toggleClass('hidden');
        });

        $('.custom-dropdown li').click(function () {
            var chosenSort = $(this).data('value');
            if (chosenSort) {
                var dropdownElem = $(this).closest('.custom-dropdown');
                var sortByElem = dropdownElem.find('.chosen-item-value');
                var isReverseElem = dropdownElem.find('.chosen-item-is-reverse');
                var isReverseVal = isReverseElem.val() === 'true';

                if (sortByElem.val() === chosenSort) {
                    isReverseElem.val(!isReverseVal).trigger('change');
                }
                else {
                    isReverseElem.val(false);
                }
                sortByElem.val(chosenSort).trigger('change');
                dropdownElem.find('.chosen-item-text').html($(this).html());

                currentSortBy[currentView] = $(this).html();
            }
            $(this).parent().addClass('hidden');
        });

        $(document).click(function (e) {
            if ($(e.target).closest('.custom-dropdown').length === 0) {
                $('.custom-dropdown ul').addClass('hidden');
            }
        });

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
    }

    function init(data) {
        setupHandlers();
        d3.json("./tmp-data/world-countries.json", function (collection) {
            map = new ResourcesMap(collection, '.map-cont');
            deployData = new Deploy(data);
            auditData = new Audit(data, 'level');

            renderMapData('level');

            $('#backdrop').addClass('hidden');
        });
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/deploy-tmp.json", function (data) {
            init(data)
        });
    } else {
        init(ccThisCont.ccThis);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue);
        });
    }
});