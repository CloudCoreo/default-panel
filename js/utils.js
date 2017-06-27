window.utils = {

    formatDate: function (date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = '' + d.getFullYear(),
            hour = '' + d.getHours(),
            minute = '' + d.getMinutes(),
            seconds = '' + d.getSeconds();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        if (hour.length < 2) hour = '0' + hour;
        if (minute.length < 2) minute = '0' + minute;
        if (seconds.length < 2) seconds = '0' + seconds;

        return [month, day, year].join('/') + ' ' + [hour, minute, seconds].join(':');
    },


    formatTime: function (timeInSecondsToFormat) {
        var diffInSeconds = timeInSecondsToFormat;

        var minutesInSeconds = Math.floor(diffInSeconds / 60) * 60;
        var hoursPassedInMinutes = Math.floor(diffInSeconds / 60 / 60) * 60;
        var daysPassedInHours = Math.floor(diffInSeconds / 60 / 60 / 24) * 24;

        var secondsPassed = Math.round((diffInSeconds - minutesInSeconds) * 100) / 100;
        var minutesPassed = Math.floor((minutesInSeconds / 60) - hoursPassedInMinutes);
        var hoursPassed = Math.floor(diffInSeconds / 60 / 60) - daysPassedInHours;
        var daysPassed = Math.floor(diffInSeconds / 60 / 60 / 24);

        var result = minutesPassed + 'm ' + secondsPassed +'s';

        if (hoursPassed > 0) {
            result = hoursPassed + 'h:' + result;
        }
        if (daysPassed > 0) {
            result = daysPassed + 'd ' +result;
        }
        return result;
    },


    sortHashOfObjectsBySortId: function (object, sortType) {

        var parseId = function (id) {
            id = id.split('.');
            var first = parseInt(id[0]);
            var second = parseInt(id[1]);

            return {
                first: first,
                second: second
            }
        };

        var compareObjectById = function (a, b) {
            var idA = object[a][sortType];
            var idB = object[b][sortType];

            if (!idA || idA === '') return 1;
            if (!idB || idB === '') return -1;

            if (sortType === 'meta_nist_171_id') {
                idA = object[a][sortType].replace('3.', '');
                idB = object[b][sortType].replace('3.', '');
            } else {
                idA = object[a][sortType];
                idB = object[b][sortType];
            }

            idA = parseId(idA);
            idB = parseId(idB);

            if (idA.first > idB.first) return 1;
            else if ((idA.first >= idB.first) && idA.second > idB.second) return 1;
            else return -1;
        };

        var buildObject = function (orderedObject, key) {
            orderedObject[key] = object[key];
            return orderedObject;
        };

        return Object
            .keys(object)
            .sort(compareObjectById)
            .reduce(buildObject, {});
    },


    objectDeepCopy: function (object) {
        var jsonObject = JSON.stringify(object);
        return JSON.parse(jsonObject);
    }
};