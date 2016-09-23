function changeBlockVisibility() {
    var icon = this.firstChild;
    var block = this.nextSibling;
    if (block.classList.contains("hidden")) {
        block.classList.remove("hidden");
        icon.innerHTML = "-";
    }
    else {
        block.classList.add("hidden");
        icon.innerHTML = "+";
    }
}

function getTree(json) {
    var data = Object.keys(json).map(function (elem) {
        if (json[elem] && (typeof json[elem] === 'object')) {
            return "<div class=\"block\">" +
                "<span class='clickable'><span class=\"icon\">-</span>" + elem + ": </span>" +
                "<div style=\"padding-left: 20px;\">" + getTree(json[elem]) + "</div>" +
                "</div>";
        }
        var cls = (!json[elem]) ? "null" : typeof json[elem];

        return "<div class=\"block\">" +
            "<span><span class=\"icon\"></span>" + elem + ": </span>" +
            "<span class=\"" + cls + "\">" + json[elem] + "</span>" +
            "</div>";
    });

    var tree = '';
    for (var i = 0; i < data.length; ++i) {
        tree += (data[i]);
    }
    return tree;
}

function fillJson(ccThis) {
    var container = document.getElementById("jsoneditor");
    var html = getTree(ccThis);
    container.innerHTML = html;

    var objects = document.getElementsByClassName("clickable");
    for (var i = 0; i < objects.length; i++) {
        objects[i].addEventListener('click', changeBlockVisibility, false);
    }
}

ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
    fillJson(newValue);
});

fillJson(ccThisCont.ccThis);
