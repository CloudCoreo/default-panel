var colorPalette = Constants.COLORS;
var sortkeys = Constants.SORTKEYS;


window.AuditUtils = {

    getOrganizedViolationData: function (_this, options) {
        var listOfAlerts = options.listOfAlerts;
        var noViolations = options.noViolations;
        var violationId = _this.attr('violation');
        var sortKey = _this.attr('sortKey');
        var resources = [];
        var suppressions = [];

        if (listOfAlerts[sortKey].alerts.hasOwnProperty(violationId)) {
            resources = listOfAlerts[sortKey].alerts[violationId].resources;
            suppressions = listOfAlerts[sortKey].alerts[violationId].suppressions;
        }

        if(suppressions.length === 0 && noViolations.hasOwnProperty(violationId)){
            suppressions = noViolations[violationId].suppressions;
        }

        return {
            violationId: _this.attr('violationId'),
            resources: resources,
            suppressions: suppressions,
            color: listOfAlerts[sortKey].color
        };
    },


    getBlockHeader: function (key, sortKey) {
        var isNoViolation = key === 'No-violations';
        var isLevel = sortKey === sortkeys.level.name;
        var isCategory = sortKey === sortkeys.category.name;
        var isService = sortKey === sortkeys.service.name;

        if (isNoViolation) return key.replace('-', ' ');
        if (isLevel || isCategory || isService || isNoViolation) return key;

        return Constants.BLOCK_HEADERS[key];
    },


    organizeDataForAdditionalSections: function (violation) {
        var data = new Violation(violation.inputs);

        data.title = violation.inputs.display_name || violation.resourceName;
        data.id = violation.resourceName;
        data.resources = [];
        data.suppressions = [];
        data.violationId = violation._id;
        data.metas = this.getRuleMetasCis(violation.inputs);

        return data;
    },


    getRuleMetasCis: function (ruleInputs) {
        var metas = [];
        Object.keys(ruleInputs).forEach(function (key) {
            if (key.indexOf('meta_') !== -1) {
                var metaTitle = key.replace('meta_', '').replace(/_/g, ' ');
                metas.push({ key: metaTitle, value: ruleInputs[key] });
            }
        });
        return metas;
    },


    isSorting: function (sortKey) {
        return Constants.SORTKEYS[sortKey].isSorting;
    },


    removeMetaPrefix: function (string) {
        return string.replace('meta_', '').replace(/_/g, ' ');
    },


    removeFieldByValue: function (arr, key, value) {
        return arr.filter(function (item) {
            return item[key] !== value;
        })
    },


    getColor: function (level, sortKey, keys, colors) {
        var color;

        if (sortKey === Constants.SORTKEYS.level.name) color = colorPalette.SeverityTones[level];
        if (!color) {
            var index = keys.indexOf(level);
            color = colors(index);
        }

        return color;
    },


    getColorRangeByKeys: function (keys) {
        var colorsRange;

        if (keys.length <= colorPalette.PurpleTones.length) colorsRange = colorPalette.PurpleTones;
        else if (keys.length === colorPalette.CoolTones.length) colorsRange = colorPalette.CoolTones;
        else if (keys.length < 9) colorsRange = colorPalette.RainbowTones;
        else colorsRange = colorPalette.Default;

        return colorsRange;
    },


    checkIfResourceIsSuppressed: function (date) {
        if (!date) {
            return false;
        }

        var now = new Date();
        var suppressedDate = new Date(date);
        return suppressedDate.getTime() >= now.getTime();
    },


    sortObjectKeysByPriority: function (keys, priorities) {
        keys.sort(function (keyA, keyB) {
            if (!priorities[keyA]) return -1;
            if (!priorities[keyB]) return 1;
            return priorities[keyA] > priorities[keyB];
        });
        return keys;
    },

    setColorsForLevels: function (levels) {
        var colorsRange = this.getColorRangeByKeys(levels, colorPalette);
        var colors = d3.scaleOrdinal(colorsRange);
        var levelKeys = Object.keys(levels);

        levelKeys.forEach(function (level) {
            levels[level].color = AuditUtils.getColor(level, Constants.SORTKEYS.level.name, levelKeys, colors);
        });
        return levels;
    }

};