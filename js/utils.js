function formatDate(date) {
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
}

function formatTime(timeInSecondsToFormat) {
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
}

function sortHashOfObjectsByField(object, field) {

    var sortObject = function (a, b) {
        if (!object[a][field]) return 1;
        if (!object[b][field]) return -1;
        return parseFloat(object[a][field]) - parseFloat(object[b][field]);
    };

    var buildObject = function (orderedObject, key) {
        orderedObject[key] = object[key];
        return orderedObject;
    };

    return Object
        .keys(object)
        .sort(sortObject)
        .reduce(buildObject, {});
}

window.utils = (function () {
    function utils () {}
    utils.prototype.formatDate = formatDate;
    utils.prototype.formatTime = formatTime;
    utils.prototype.sortHashOfObjectsByField = sortHashOfObjectsByField;
    return new utils();
}());
