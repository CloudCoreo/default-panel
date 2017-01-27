var mapRegions = {
    'North America': {
        region: 'North America',
        img: './images/maps/north-america.svg',
        cssClass: 'north-america',
        awsRegions: [
            'us-east-1',
            'us-east-2',
            'us-west-1',
            'us-west-2']
    },
    'South America': {
        region: 'South America',
        img: './images/maps/south-america.svg',
        cssClass: 'south-america',
        awsRegions: ['sa-east-1']
    },
    'Asia Pacific': {
        region: 'Asia Pacific',
        img: './images/maps/asia-pacific.svg',
        cssClass: 'asia-pacific',
        awsRegions: [
            'ap-northeast-1',
            'ap-southeast-1',
            'ap-southeast-2',
            'ap-south-1',
            'ap-northeast-2']
    },
    'Europe / Middle East / Africa': {
        region: 'Europe / Middle East / Africa',
        img: './images/maps/europe-middle-east-africa.svg',
        cssClass: 'europe',
        awsRegions: [
            'eu-central-1',
            'eu-west-1']
    },
    'Global': {
        region: 'Global',
        cssClass: 'global-region',
        awsRegions: [
            'AWS',
            'CloudCoreo']
    }
};

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
    'eu-central-1': {region: 'Europe / Middle East / Africa', city: 'Frankfurt', latitude: 50.1213152, longitude: 8.3563887, countryId: 'DEU'},
    'eu-west-1': {region: 'Europe / Middle East / Africa', city: 'Ireland', latitude: 53.4098083, longitude: -10.5742474, countryId: 'IRL'},
    'sa-east-1': {
        region: 'South America',
        city: 'Sao Paolo',
        latitude: -23.6815315,
        longitude: -46.8754815,
        countryId: 'BRA'
    },
    'us-east-1': {
        region: 'North America',
        city: 'N. Virginia',
        latitude: 37.9266816,
        longitude: -83.9481084,
        countryId: 'USA'
    },
    'us-east-2': {
        region: 'North America',
        city: 'Ohio',
        latitude: 40.1685993,
        longitude: -84.9182274,
        countryId: 'USA'
    },
    'us-west-1': {
        region: 'North America',
        city: 'N. California',
        latitude: 38.8207129,
        longitude: -124.5542165,
        countryId: 'USA'
    },
    'us-west-2': {
        region: 'North America',
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
    },
    'CloudCoreo': {region: 'Global'},
    'AWS': {region: 'Global'}
};

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

    var circleRadius = element.select('circle').attr('r');
    var rectX = position.cx + parseFloat(circleRadius) + 5;
    var rectY = position.cy - 10;

    element.append('rect')
        .attr('x', rectX)
        .attr('y', rectY)
        .attr('width', 150)
        .attr('height', 45)
        .attr('fill', '#eee');

    appendTextIntoElement(element, region.key, {
        'id': region.key + '-info',
        'x': rectX + 20,
        'y': rectY + 10,
        'dy': '.5em',
        'font-size': '7pt',
        'font-weight': '600'
    });

    if (!region.deployed && !region.violations) {
        appendTextIntoElement(element, 'Null', {
            'id': region.key + '-info',
            'x': rectX + 20,
            'y': rectY + 20,
            'dy': '.5em',
            'font-size': '6pt'
        });

        appendCircleIntoElement(element, {
            'id': region.key + '-info',
            'r': 4,
            'cx': rectX + 10,
            'cy': rectY + 21,
            'fill': '#eee',
            'stroke': '#bbb',
            'stroke-width': '1px'
        });
    } else {

        appendTextIntoElement(element, region.deployed + ' Resources Deployed', {
            'id': region.key + '-info',
            'x': rectX + 20,
            'y': rectY + 20,
            'dy': '.5em',
            'font-size': '6pt'
        });

        appendCircleIntoElement(element, {
            'id': region.key + '-info',
            'r': 4,
            'cx': rectX + 10,
            'cy': rectY + 21,
            'fill': '#2B7AE5',
            'stroke-width': '1px'
        });

        appendTextIntoElement(element, region.violations + ' Violations Found in Audit', {
            'id': region.key + '-info',
            'x': rectX + 20,
            'y': rectY + 30,
            'dy': '.5em',
            'font-size': '6pt'
        });

        appendCircleIntoElement(element, {
            'id': region.key + '-info',
            'r': 4,
            'cx': rectX + 10,
            'cy': rectY + 31,
            'fill': '#fff',
            'stroke': '#ff0000',
            'stroke-width': '1px'
        });
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

    if (!region.violations && !region.deployed) {
        drawNullCircle(g, region);
        return;
    }

    drawCircle(g, region.deployed, '#2B7AE5', '#2B7AE5', '#ffffff', region);
    drawCircle(g, region.violations, '#fff', '#ff0000', '#E53E2B', region, region.deployed);
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
        if (error) { console.log(error); return; }
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
    var tpl = $.templates('#map-region-tpl');
    var data = {
        region: 'Global',
        cssClass: 'global-region',
        subregions: regions
    };
    var rendered = tpl.render(data);
    $('.map-container').append(rendered);

    if (!regions) return;

    regions.forEach(function(region) {
        var mapTpl = $.templates('#global-region-tpl');
        $('.' + data.cssClass).append(mapTpl.render(region));
        $('.' + data.cssClass).find('img').attr('src', 'images/maps/' + region.key+'.png');

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
    $('resources-are-loading').removeClass('hidden');
    $('.map-container').addClass('empty');
}

function renderRegions(mapData) {
    var regions = mapRegions;

    Object.keys(mapData).forEach(function(subRegionName) {
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
