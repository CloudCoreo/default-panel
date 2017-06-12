var colorPalette = Constants.COLORS;


window.AuditUtils = {

    getOrganizedViolationData: function (_this, listOfAlerts) {
        var violationId = _this.attr('violation');
        var sortKey = _this.attr('sortKey');

        return {
            violationId: _this.attr('violationId'),
            resources: listOfAlerts[sortKey].alerts[violationId].resources,
            suppressions: listOfAlerts[sortKey].alerts[violationId].suppressions,
            color: listOfAlerts[sortKey].color
        };
    },


    organizeDataForAdditionalSections: function (violation) {
        var data = new Violation(violation.inputs);

        data.title = violation.inputs.display_name || violation.resourceName;
        data.id = violation.resourceName;
        data.resources = [];
        data.suppressions = [];
        data.violationId = violation._id;
        data.metas = this.getRuleMetasCis(violation.inputs);
        data.isPassed = false;

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
        if (date === undefined) return false;

        var now = new Date();

        if (date.length) {
            var suppressedDate = new Date(date);
            return suppressedDate.getTime() >= now.getTime();
        }
        return false;
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