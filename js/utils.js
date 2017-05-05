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

function replaceSymbolsToSpace(string, symbols) {
    for(var i = 0; i < symbols.length; i++) {
        var exp = new RegExp(symbols[i], 'g');
        string = string.replace(exp, ' ');
    }
    return string;
}

function sortHashOfObjectsByField(object, field) {
    var sortedObject = {};
    var tmpArray = [];

    Object.keys(object).forEach((function (key) {
        object[key].hashName = key;
        tmpArray.push(object[key]);
    }));

    tmpArray.sort(function (a, b) {
        if (!a[field]) return 1;
        if (!b[field]) return -1;
        return a[field] > b[field];
    });

    tmpArray.forEach(function (hash) {
        sortedObject[hash.hashName] = hash;
        delete sortedObject[hash.hashName].hashName;
    });

    return sortedObject;
}

window.utils = (function () {
    function utils () {}
    utils.prototype.formatDate = formatDate;
    utils.prototype.formatTime = formatTime;
    utils.prototype.replaceSymbolsToSpace = replaceSymbolsToSpace;
    utils.prototype.sortHashOfObjectsByField = sortHashOfObjectsByField;
    return new utils();
}());
