function roundedRect(x, y, width, height, radius) {
    return "M" + x + "," + y
        + "a" + radius + "," + radius + " 0 0 1 " + radius + "," + -radius
        + "h" + (width - radius)
        + "a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius
        + "v" + (height - radius)
        + "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + radius
        + "h" + (radius - width)
        + "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + -radius
        + "z";
}

function drawPie(pieData, color, cont) {
    $('.pie').html('');

    var w = 300,
        h = pieData.length * 35 + 10,
        r = 65;

    var dataSum = 0;
    pieData.forEach(function (elem) {
        dataSum += +elem.value;
    });

    h = (130 < h) ? h : 130;

    var vis = d3.select(cont)
        .append("svg:svg")
        .data([pieData])
        .attr("viewBox", '0 0 330 ' + h)
        .append("svg:g")
        .attr("transform", "translate(" + r + "," + r + ")");

    var arc = d3.arc()
        .outerRadius(r)
        .innerRadius(0);

    var pie = d3.pie()
        .value(function (d) {
            return +d.value;
        });

    var g = vis.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc");

    var onclick = function (d, i) {
        $('.content').animate({
            scrollTop: $("." + pieData[i].label).offset().top
        }, 500);
    };

    g.append("svg:path")
        .attr("fill", function (d, i) {
            return pieData[i].color;
        })
        .attr("d", arc)
        .style("stroke", "#fff")
        .style("stroke-width", "3px")
        .on("click", onclick);

    g.append("svg:text")
        .attr("transform", function (d, i) {
            return "translate(" + (r + 50) + ", " + (22 - r + i * 35) + ")";
        })
        .attr("text-anchor", "start")
        .style("fill",function (d, i) {
            return d.value > 0 ? "#000000" : "#C4C4C4";
        })
        .style("font-family", "Arial")
        .style("font-size", "12px")
        .style('text-transform', 'uppercase')
        .text(function (d, i) {
            if (pieData[i].value === 0) {
                return pieData[i].value + ' ' + pieData[i].label
            }
            return pieData[i].value + ' ' + pieData[i].label + ' (' + (pieData[i].value * 100 / dataSum).toFixed(1) + '%)';
        })
        .on("click", onclick);

    g.append("path")
        .attr("d", function (d, i) {
            return roundedRect(r + 20, 10 - r + i * 35, 20, 20, 4);
        })
        .attr("fill", function (d, i) {
            return pieData[i].color || color(i);
        })
        .on("click", onclick);
}

window.ResourcesPie = (function () {
    'use strict';
    var cont = '.pie';
    function ResourcesPie (_cont) {
        cont = _cont;
    }
    ResourcesPie.prototype.drawPie = function (pieData, color) { drawPie(pieData, color, cont);}
    return ResourcesPie;
}());
