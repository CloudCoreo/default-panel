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

function calcRadius(value) {
    var radius = value;
    if(radius < 15) radius = 15;
    if(radius > 50) radius = 50;
    return radius;
}

function drawCircle(g, value, fillColor, strokeColor, textColor, shift) {
    if(!value) return;

    var radius = calcRadius(value);
    var shiftRadius = 0;
    if (shift) shiftRadius = calcRadius(shift < 25 ? 25 : shift);

    var cx = g.attr('cx')*1.0 + shiftRadius;
    var cy = g.attr('cy');

    g.append("circle")
        .attr('r', radius)
        .attr('cx', cx)
        .attr('cy', cy)
        .attr("fill", fillColor)
        .attr("stroke", strokeColor)
        .attr("stroke-width", '1px');

    g.append("svg:text")
        .attr("dy", "0.4em")
        .attr('x', cx)
        .attr('y', cy)
        .attr("text-anchor", "middle")
        .attr("fill", textColor)
        .text(value);
}

function drawCircleOnMap(region) {
    var g =  d3.select('#' + region.key);
    drawCircle(g, region.deployed, '#2B7AE5', '#2B7AE5', '#ffffff');
    drawCircle(g, region.violations, '#fff', '#ff0000', '#E53E2B', region.deployed);
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
    $('.map').append(rendered);

    if (!regions.length) return;

    d3.xml(data.img).get(function(error, xml) {
        if (error) { console.log(error); return; }

        var svgNode = xml.getElementsByTagName('svg')[0];
        d3.select('.' + data.cssClass)
            .append('svg').node().appendChild(svgNode);

        data.subregions.forEach(function(region) {
            drawCircleOnMap(region);
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
    $('.map').append(rendered);

    regions.forEach(function(region) {
        var mapTpl = $.templates('#global-region-tpl');
        $('.' + data.cssClass).append(mapTpl.render(region));
        $('.' + data.cssClass).find('img').attr('src', 'images/maps/'+region.key+'.png')
        var g = d3.select('.' + data.cssClass + ' .' + region.key)
            .append('svg')
            .style('max-width', '185px')
            .append('g')
            .attr('cx', 40)
            .attr('cy', 75);
        drawCircle(g, region.deployed, '#2B7AE5', '#2B7AE5', '#ffffff');
        drawCircle(g, region.violations, '#fff', '#ff0000', '#E53E2B', region.deployed);
    });
}

function render(mapData) {
    $('.map').html('');

    var regions = {};
    Object.keys(mapData).forEach(function (region) {
        if(!regions[regionsList[region].region]) regions[regionsList[region].region] = [];
        regions[regionsList[region].region].push({key: region, deployed: mapData[region].deployed, violations: mapData[region].violations});
    });
    Object.keys(regions).forEach(function (key) {
        if(key !== 'Global') renderRegion(regions[key], key);
    });

    Object.keys(mapRegions).forEach(function(region)  {
        if(!regions[region]) renderRegion([], region);
    });

    if(regions['Global']) renderGlobalData(regions['Global']);
}

window.staticMaps = (function () {
    return render;
}());
