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
    var tabsHeight = $('.options-container').height();
    var height = pieData.length * 35 + 10,
        radius = 65;

    var dataSum = 0;
    pieData.forEach(function (elem) {
        dataSum += +elem.value;
    });

    height = (130 < height) ? height : 130;

    var vis = d3.select(cont)
        .append("svg:svg")
        .data([pieData])
        .attr("viewBox", '0 0 330 ' + height)
        .append("svg:g")
        .attr("transform", "translate(" + radius + "," + radius + ")");

    var arc = d3.arc()
        .outerRadius(radius)
        .innerRadius(0);

    var pie = d3.pie()
        .value(function (d) {
            return +d.value;
        });

    var g = vis.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc");

    var onclick = function (d, index) {
        $('.scrollable-area').animate({
            scrollTop: $("." + pieData[index].label).offset().top - tabsHeight
        }, 200);
    };

    g.append("svg:path")
        .attr("fill", function (d, index) {
            return pieData[index].color;
        })
        .attr("d", arc)
        .style("stroke", "#fff")
        .style("stroke-width", "1px")
        .style("cursor", 'pointer')
        .on("click", onclick);

    g.append("svg:text")
        .attr("transform", function (d, index) {
            return "translate(" + (radius + 50) + ", " + (22 - radius + index * 35) + ")";
        })
        .attr("text-anchor", "start")
        .style("fill", function (d, index) {
            return d.value > 0 ? "#000000" : "#C4C4C4";
        })
        .style("font-family", "Arial")
        .style("font-size", "12px")
        .style('text-transform', 'uppercase')
        .text(function (d, index) {
            if (pieData[index].value === 0) {
                return pieData[index].value + ' ' + pieData[index].label
            }
            if(pieData[index].label.toLowerCase()=='informational')
                return 'n/a';
            else
                return pieData[index].value + ' ' + pieData[index].label + ' (' + (pieData[index].value * 100 / dataSum).toFixed(1) + '%)';
        })
        .style("cursor", 'pointer')
        .on("click", onclick);

    g.append("path")
        .attr("d", function (d, index) {
            return roundedRect(radius + 20, 10 - radius + index * 35, 20, 20, 4);
        })
        .attr("fill", function (d, index) {
            return pieData[index].color || color(index);
        })
        .style("cursor", 'pointer')
        .on("click", onclick);
}

window.ResourcesPie = (function () {
    'use strict';
    var cont = '.pie';

    function ResourcesPie(_cont) {
        cont = _cont;
    }

    ResourcesPie.prototype.drawPie = function (pieData, color) {
        drawPie(pieData, color, cont);
    };
    return ResourcesPie;
}());
