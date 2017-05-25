var colorPalette = constants.COLORS;


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
            if (key !== 'meta_cis_id' && key.indexOf('meta_cis') !== -1) {
                var metaTitle = key.replace('meta_', '').replace('_', ' ');
                metas.push({ key: metaTitle, value: ruleInputs[key] });
            }
        });
        return metas;
    },


    isMetaAttribute: function (sortKey) {
        return sortKey.indexOf('meta_') !== -1;
    },


    removeMetaPrefix: function (string) {
        return string.replace('meta_', '').replace(/_/g, ' ');
    },


    getColor: function (level, sortKey, keys, colors) {
        var color;

        if (sortKey === 'level') color = colorPalette.SeverityTones[level];
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


    sortObjectPropertiesByPriority: function (object, priorities) {
        var keys = Object.keys(object);
        var newObject = {};

        keys.sort(function (keyA, keyB) {
            return priorities[keyA] > priorities[keyB];
        });

        keys.forEach(function (key) {
            newObject[key] = object[key];
        });
        return newObject;
    },


    setColorsForLevels: function (levels) {
        var colorsRange = this.getColorRangeByKeys(levels, colorPalette);
        var colors = d3.scaleOrdinal(colorsRange);
        var levelKeys = Object.keys(levels);

        levelKeys.forEach(function (level) {
            levels[level].color = AuditUtils.getColor(level, 'level', levelKeys, colors);
        });
        return levels;
    }

};