var mapRegions = Constants.REGIONS.MAP_REGIONS;
var regionsList = Constants.REGIONS.REGION_LIST;

function moveToFront(elem) {
    return elem.each(function() {
        this.parentNode.appendChild(this);
    });
}

function calcRadius(value) {
    var radius = value;
    if(radius < 15) radius = 15;
    if(radius > 30) radius = 30;
    return radius;
}

function appendCircleIntoElement(element, options) {
    return element
        .append('circle')
        .attrs(options);
}

function appendTextIntoElement(element, text, options) {
    return element.append('text')
        .attrs(options)
        .text(text);
}

function showTooltip(position, element, region) {
    function addMessage(element, id, data) {
        appendTextIntoElement(element, data.text, {
            'id': id,
            'x': data.rectX + 20,
            'y': data.rectY + 20,
            'dy': '.5em',
            'font-size': '6pt'
        });

        appendCircleIntoElement(element, {
            'id': id,
            'r': 4,
            'cx': data.rectX + 10,
            'cy': data.rectY + 21,
            'fill': data.fill,
            'stroke': data.stroke,
            'stroke-width': '1px'
        });
    }

    var circleRadius = element.select('circle').attr('r');
    var rectX = position.cx + parseFloat(circleRadius) + 5;
    var rectY = position.cy - 10;

    element.append('rect')
        .attr('x', rectX)
        .attr('y', rectY)
        .attr('width', 150)
        .attr('height', 45 + (region.objects ? 10 : 0))
        .attr('fill', '#eee');

    appendTextIntoElement(element, region.key, {
        'id': region.key + '-info',
        'x': rectX + 20,
        'y': rectY + 10,
        'dy': '.5em',
        'font-size': '7pt',
        'font-weight': '600'
    });
    var id = region.key + '-info';

    if (!region.deployed && !region.violations && !region.objects) {
        addMessage(element, id, {
            text: 'Null',
            rectX: rectX,
            rectY: rectY,
            fill: '#eee',
            stroke: '#bbb'});
        return;
    }
    addMessage(element, id, {
        text: region.deployed + ' ' + Constants.UITEXTS.MAP_MESSAGES.RESOURCES_DEPLOYED,
        rectX: rectX,
        rectY: rectY,
        fill: '#2B7AE5',
        stroke: '#2B7AE5'});

    addMessage(element, id, {
        text: region.violations + ' ' + Constants.UITEXTS.MAP_MESSAGES.VIOLATIONS_FOUND,
        rectX: rectX,
        rectY: rectY + 10,
        fill: '#fff',
        stroke: '#ff0000'});

    if (region.objects) {
        addMessage(element, id, {
            text: region.objects + ' ' + uiTexts.MAP_MESSAGES.CLOUD_OBJECTS_FOUND,
            rectX: rectX,
            rectY: rectY + 20,
            fill: '#fff',
            stroke: '#00aa00'});
    }
}

function drawNullCircle(element, region) {

    var position = {};
    position.cx = parseFloat(element.attr('cx'));
    position.cy = parseFloat(element.attr('cy'));

    function onMouseOver(d) {
        showTooltip(position, element, region);
        moveToFront(element);
    }

    function onMouseOut(d) {
        element.select('rect').remove();
        element.selectAll('#' + region.key + '-info').remove();
    }

    element
        .on('mouseover', onMouseOver)
        .on('mouseout', onMouseOut);

    appendCircleIntoElement(element, {
        'r': 10,
        'cx': position.cx,
        'cy': position.cy,
        'fill': '#eee',
        'stroke': '#bbb',
        'stroke-width': '2px'
    });

    element.append('svg:image')
        .attr('xlink:href', './images/not_used_region.svg')
        .attr('width', 14)
        .attr('height', 12)
        .attr('x', position.cx - 7)
        .attr('y', position.cy - 6);
}

function drawCircle(element, value, fillColor, strokeColor, textColor, region, shift) {
    if(!value) return;

    var radius = calcRadius(value);
    var shiftRadius = 0;
    if (shift) shiftRadius = calcRadius(shift < 25 ? 25 : shift);

    var position = {};
    position.cx = element.attr('cx') * 1.0 + shiftRadius;
    position.cy = element.attr('cy');

    element.on('mouseover', function(d) {
        moveToFront(d3.select(this));
    });

    function onMouseOver(d) {
        showTooltip(position, element, region);
        moveToFront(element);
    }

    function onMouseOut(d) {
        element.select('rect').remove();
        element.selectAll('#' + region.key + '-info').remove();
    }

    if (region.key !== 'CloudCoreo' && region.key !== 'AWS') {
        element
            .on('mouseover', onMouseOver)
            .on('mouseout', onMouseOut);
    }

    appendCircleIntoElement(element, {
        'r': radius,
        'cx': position.cx,
        'cy': position.cy,
        'fill': fillColor,
        'stroke': strokeColor,
        'stroke-width': '1px'
    });

    appendTextIntoElement(element, value, {
        'x': position.cx,
        'y': position.cy,
        'dy': '0.4em',
        'text-anchor': 'middle',
        'fill': textColor
    });
}

function drawCircleOnMap(region) {
    var g =  d3.select('#' + region.key);
    g.on('mouseover', function(d) {
        moveToFront(d3.select(this));
    });

    if (!region.violations && !region.deployed && !region.objects) {
        drawNullCircle(g, region);
        return;
    }

    drawCircle(g, region.deployed, '#2B7AE5', '#2B7AE5', '#ffffff', region);
    drawCircle(g, region.violations, '#fff', '#ff0000', '#E53E2B', region, region.deployed);
    if (region.objects) drawCircle(g, region.objects, '#fff', '#00aa00', '#00aa00', region, region.violations);
}

function renderRegion(regions, key) {
    var tpl = $.templates('#map-region-tpl');
    var data = {
        region: mapRegions[key].region,
        cssClass: mapRegions[key].cssClass,
        subregions: regions,
        img: mapRegions[key].img
    };
    var unusedRegions = mapRegions[key].awsRegions;
    regions.forEach(function (region) {
        unusedRegions.splice(unusedRegions.indexOf(region.key), 1);
    });
    data.subregionsWithoutData = unusedRegions.join(', ');

    var rendered = tpl.render(data);
    $('.map-container').append(rendered);

    d3.xml(data.img).get(function(error, xml) {
        if (error) { return; }
        $('.' + data.cssClass).html('');

        var svgNode = xml.getElementsByTagName('svg')[0];
        d3.select('.' + data.cssClass)
            .append('svg').node().appendChild(svgNode);

        data.subregions.forEach(function(subRegion) {
            drawCircleOnMap(subRegion);
        });

        unusedRegions.forEach(function(subRegionKey) {
            var subRegion = {
                key: subRegionKey,
                violations: 0,
                deployed: 0
            };
            drawCircleOnMap(subRegion);
        });
    });
}

function renderGlobalData(regions) {
    if (!regions) return;

    var tpl = $.templates('#map-region-tpl');
    var data = {
        region: 'Global',
        cssClass: 'global-region',
        subregions: regions
    };
    var rendered = tpl.render(data);
    $('.map-container').append(rendered);

    regions.forEach(function(region) {
        var mapTpl = $.templates('#global-region-tpl');
        $('.' + data.cssClass).append(mapTpl.render(region));
        $('.' + data.cssClass).find('img').attr('src', 'images/maps/' + region.key + '.png');

        var g = d3.select('.' + data.cssClass + ' .' + region.key)
            .append('svg')
            .style('max-width', '185px')
            .append('g')
            .attr('cx', 95 - calcRadius(region.deployed) / 2)
            .attr('cy', 75);

        drawCircle(g, region.deployed, '#2B7AE5', '#2B7AE5', '#ffffff', region);
        drawCircle(g, region.violations, '#fff', '#ff0000', '#E53E2B', region, region.deployed);
    });
}

function initView() {
    var mapCont = $('.map-container');
    mapCont.removeClass('empty');
    mapCont.html('');
}

function showResourcesAreBeingLoadedMessage() {
    $('.map .resources-are-loading').removeClass('hidden');
    $('.map-container').addClass('empty');
}

function renderRegions(mapData) {
    var regions = mapRegions;

    Object.keys(mapData).forEach(function(subRegionName) {
        if(!regionsList[subRegionName]) return;
        var regionName = regionsList[subRegionName].region;

        if (regionName in regions) {
            if(!regions[regionName].subregions) regions[regionName].subregions = [];
            var data = mapData[subRegionName];
            data.key = subRegionName;
            regions[regionName].subregions.push(data);
        }
    });

    Object.keys(regions).forEach(function (key) {
        var subRegions = regions[key].subregions || [];
        if(key !== 'Global') renderRegion(subRegions, key);
    });

    if(regions['Global'] && regions['Global'].subregions) renderGlobalData(regions['Global'].subregions);
}

function render(mapData) {
    initView();
    if (!mapData) {
        showResourcesAreBeingLoadedMessage();
        return;
    }
    renderRegions(mapData);
}

window.staticMaps = (function () {
    return render;
}());
