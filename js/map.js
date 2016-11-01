var regionsList = {
    'ap-northeast-1': {
        region: 'Asia Pacific',
        city: 'Tokyo',
        latitude: 35.6735763,
        longitude: 139.4302066,
        countryId: 'JPN'
    },
    'ap-southeast-1': {
        region: 'Asia Pacific',
        city: 'Singapore',
        latitude: 1.3154015,
        longitude: 103.566832,
        countryId: 'IDN'
    },
    'ap-southeast-2': {
        region: 'Asia Pacific',
        city: 'Sydney',
        latitude: -33.8458826,
        longitude: 150.3715633,
        countryId: 'AUS'
    },
    'eu-central-1': {region: 'EU', city: 'Frankfurt', latitude: 50.1213152, longitude: 8.3563887, countryId: 'DEU'},
    'eu-west-1': {region: 'EU', city: 'Ireland', latitude: 53.4098083, longitude: -10.5742474, countryId: 'IRL'},
    'sa-east-1': {
        region: 'South America',
        city: 'Sao Paolo',
        latitude: -23.6815315,
        longitude: -46.8754815,
        countryId: 'BRA'
    },
    'us-east-1': {
        region: 'US East',
        city: 'N. Virginia',
        latitude: 37.9266816,
        longitude: -83.9481084,
        countryId: 'USA'
    },
    'us-east-2': {
        region: 'US East',
        city: 'Ohio',
        latitude: 40.1685993,
        longitude: -84.9182274,
        countryId: 'USA'
    },
    'us-west-1': {
        region: 'US West',
        city: 'N. California',
        latitude: 38.8207129,
        longitude: -124.5542165,
        countryId: 'USA'
    },
    'us-west-2': {
        region: 'US West',
        city: 'Oregon',
        latitude: 44.061906,
        longitude: -125.0254052,
        countryId: 'USA'
    },
    'ap-south-1': {
        region: 'Asia Pacific',
        city: 'Mumbai',
        latitude: 19.0830943,
        longitude: 72.7411199,
        countryId: 'IND'
    },
    'ap-northeast-2': {
        region: 'Asia Pacific',
        city: 'Seoul',
        latitude: 37.5653133,
        longitude: 126.7093693,
        countryId: 'KOR'
    }
};
var mainSvg;
function drawMap(collection, mapCont) {
    var centered;
    var w = 980;
    var h = 600;
    var g;

    function mapClicked(d) {
        var x, y, k;

        if (d && centered !== d) {
            var centroid = path.centroid(d);
            x = centroid[ 0 ];
            y = centroid[ 1 ] * 1.3;
            k = 3;
            centered = d;
        } else {
            x = w / 2;
            y = h / 2;
            k = 1;
            centered = null;
        }

        g.selectAll("path")
            .classed("active", centered && function (d) {
                    return d === centered;
                });

        g.transition()
            .duration(750)
            .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    }


    var xy = d3.geoEquirectangular();
    var path = d3.geoPath()
        .projection(xy);

    var svg = d3.select(mapCont).insert("svg:svg")
        .attr("viewBox", '0 0 980 600');

    svg.append("rect")
        .attr("class", "background")
        .attr("width", w)
        .attr("height", h)
        .attr("fill", "#ffffff")
        .on("click", mapClicked);

    g = svg.append("g");
    g.append("g")
        .attr("id", "states")
        .selectAll("path")
        .data(collection.features)
        .enter().append("svg:path")
        .attr("d", path)
        .attr("transform", "scale(1, 1.3)")
        .attr("fill", function (d) {
            var keys = Object.keys(regionsList);
            for (var i = 0; i < keys.length; ++i) {
                if (regionsList[ keys[ i ] ].countryId === d.id)
                    return "#2b7ae5";
            }
            return '#e6e6e6';

        })
        .style("stroke", "#fff")
        .style("stroke-width", "1px")
        .on("mouseover", function (d) {
            d3.select(this)
                .append("svg:title")
                .text(d.properties.name);
        })
        .on("click", mapClicked);


    g.append("g").attr("id", "map-bubbles-cont");

    return g;
}

function drawCirclesOnMap(mapData) {
    var g = mainSvg;
    $('g.map-bubbles-cont').html('');

    var orgMapData = [];
    Object.keys(mapData).forEach(function (region) {
        Object.keys(mapData[ region ]).forEach(function (type) {
            orgMapData.push({
                region: region,
                type: type,
                value: mapData[ region ][ type ].value,
                color: mapData[ region ][ type ].color
            });
        });
    });

    var xy = d3.geoEquirectangular();

    var circles = g.select('#map-bubbles-cont');
    circles.selectAll('g').remove();

    var elem = circles.selectAll('g').data(orgMapData);
    var elemEnter = elem.enter()
        .append("g")
        .attr("type", function (d) {
            return d.type;
        })
        .attr("transform", function (d, i) {
            var xi = xy([ regionsList[ d.region ].longitude, regionsList[ d.region ].latitude ])[ 0 ] + i * 5,
                yi = xy([ regionsList[ d.region ].longitude, regionsList[ d.region ].latitude ])[ 1 ] * 1.3 + i * 5;
            return "translate(" + xi + "," + yi + ")";
        });

    elemEnter.append("circle")
        .attr("fill", function (d) {
            return d.color;
        })
        .attr("r", function (d) {
            return (d.value < 90) ? 15 : d.value / 6;
        })
        .attr("title", function (d) {
            return d.value;
        })
        .style("opacity", "0.6")
        .on("mouseover", function (d) {
            d3.select(this).style("stroke", d.color).style("stroke-width", "5px").style("opacity", "1");
        })
        .on("mouseout", function (d) {
            d3.select(this).style("fill", d.color).style("stroke", "none").style("opacity", "0.6");
        });

    elemEnter
        .append("svg:text")
        .attr("dy", "0.2em")
        .attr("text-anchor", "middle")
        .attr("fill", "#e4e4e4")
        .text(function (d) {
            return d.value;
        })
        .on("mouseover", function (d) {
            return false;
        });
}

function drawMapHistory(mapData, mapHistoryCont) {
    $(mapHistoryCont).html('');
    var orgMapData = {};
    Object.keys(mapData).forEach(function (region) {
        Object.keys(mapData[ region ]).forEach(function (type) {
            if (!orgMapData[ type ]) {
                orgMapData[ type ] = {color: mapData[ region ][ type ].color, data: []};
            }
            orgMapData[ type ].data.push({region: region, type: type, value: mapData[ region ][ type ].value});
        });
    });

    var types = Object.keys(orgMapData)
    for (var i = 0; i < types.length; ++i) {
        var rowsData = '';
        for (var j = 0; j < orgMapData[ types[ i ] ].data.length; ++j) {
            rowsData += '<br/>' + orgMapData[ types[ i ] ].data[ j ].value + ' ' + regionsList[ orgMapData[ types[ i ] ].data[ j ].region ].city;
        }

        var html = '<div class="flex-grow history-column">' +
            '<span class="history-header" style="color:' + orgMapData[ types[ i ] ].color + ';">' + types[ i ] + '</span>' +
            rowsData +
            '</div>';
        $(mapHistoryCont).append(html);
    }
}

window.ResourcesMap = (function () {
    'use strict';

    function ResourcesMap (collection, mapCont) {
        mainSvg = drawMap(collection, mapCont);
    }
    ResourcesMap.prototype.drawCirclesOnMap = drawCirclesOnMap;
    ResourcesMap.prototype.drawMapHistory = drawMapHistory;
    return ResourcesMap;
}());