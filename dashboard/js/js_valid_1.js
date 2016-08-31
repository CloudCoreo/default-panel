var xmlhttp = new XMLHttpRequest();
xmlhttp.open('GET', 'http://192.168.88.238:3000/', true);
xmlhttp.send();
xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        callback(xmlhttp.responseText);
    }
};
