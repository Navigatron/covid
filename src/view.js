
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {model} from './model';

// Constants and preset data
const svgWidth = 960;
const svgHeight = 600;
const transChange = 50;
const transHover = 100;
const colorUndefined = '#F1F1F1';
const colorMap = {
	316228:	'#0D101D',
	100000:	'#27193F',
	31623:	'#4A1B59',
	10000:	'#6F1A6C',
	3162:	'#941E76',
	1000:	'#B62C76',
	316:	'#D3446A',
	100:	'#E8644E',
	32:	'#EB8B41',
	10:	'#EDAF50',
	3:	'#EFD176',
	1:	'#F6F5A6',
	0:	'#CFFEB2'
};
const legendKeys = [
	0,
	1,
	2,
	5,
	10,
	20,
	50,
	100,
	200,
	500,
	1000,
	2000,
	5000,
	10000,
	20000,
	50000,
	100000,
	200000
];
const legendWidth = svgWidth / legendKeys.length;
const legendHeight = 20;

// We need some state for the tooltip
let currentKey;
let currentDate;

// Elements that are nice to have references to
let svg;
let tooltip;
let statusLine;

// Utility function for calculating Colors
const color = d3
	.scale
	.log()
	.domain(Object.keys(colorMap).map(a => Number.parseInt(a, 10) + 1)) // ParseInt?
	.range(Object.values(colorMap));

// Utility function for geo paths
const path = d3.geo.path();

// Utility function for cleaning fips codes
const fipsFilter = fips => {
	fips = String(fips);
	if (fips.length === 4) {
		fips = '0' + fips;
	}

	if (fips === '46113') {
		fips = '46102';
	}

	return fips;
};

// Create the Elements
function buildScreen() {
	// SVG
	svg = d3
		.select('#map')
		.append('svg')
		.attr('width', svgWidth)
		.attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight)
		.attr('height', svgHeight)
		.style('max-width', '100%')
		.style('height', '100%')
		.style('margin', '0px auto');

	// Tooltip
	tooltip = d3
		.select('body')
		.append('div')
		.attr('class', 'tooltip')
		.style('opacity', 0);

	// Status Line
	statusLine = svg
		.append('text')
		.attr('x', '50%')
		.attr('y', '20px')
		.attr('text-anchor', 'middle')
		.text('Loading Data...');

	// Legend
	const legend = svg
		.selectAll('g.legend')
		.data(legendKeys)
		.enter()
		.append('g')
		.attr('class', 'legend');

	legend
		.append('rect')
		.attr('x', (d, i) => {
			return (i * legendWidth);
		})
		.attr('y', 550)
		.attr('width', legendWidth)
		.attr('height', legendHeight)
		.style('fill', d => {
			return color(d + 1);
		})
		.style('stroke-width', 0.5)
		.style('stroke', 'black');

	legend
		.append('text')
		.attr('x', (d, i) => {
			return (i * legendWidth);
		})
		.attr('y', 590)
		.text(d => {
			return String(d);
		});
}

// When the US geoJson data is ready, draw the US.
function drawUS(us) {
	// Counties
	svg
		.append('g')
		.attr('class', 'county')
		.selectAll('path')
		.data(topojson.feature(us, us.objects.counties).features)
		.enter()
		.append('path')
		.attr('d', path)
		.style('fill', colorUndefined)
		.style('stroke-width', 0.1)
		.style('stroke', colorUndefined)
		.on('mouseover', function (d) { // D.id should be the fips code??
			const sel = d3.select(this);
			// Sel.moveToFront();
			sel.transition().duration(transHover).style({'stroke-width': 0.5});
			tooltip.transition().duration(transHover).style('opacity', 1);
			const fips = fipsFilter(d.id);
			Promise.all([model.names, model.data]).then(r => {
				tooltip.text(`${r[0][fips] || 'unknown'}: ${r[1][currentDate]?.[fips]?.[currentKey] || '0'}`);
			});
			tooltip
				.style('left', (d3.event.pageX + 10) + 'px')
				.style('top', (d3.event.pageY - 30) + 'px');
		})
		.on('mouseout', function () {
			const sel = d3.select(this);
			// Sel.moveToBack();
			sel
				.transition()
				.duration(transHover)
				.style({'stroke-width': 0.1});
			tooltip
				.transition()
				.duration(transHover)
				.style('opacity', 0);
		});

	// States
	svg
		.append('g')
		.attr('class', 'state')
		.selectAll('path')
		.data(topojson.feature(us, us.objects.states).features)
		.enter()
		.append('path')
		.attr('d', path)
		.style({
			opacity: 1,
			'fill-opacity': 0,
			stroke: 'black',
			'stroke-width': 0.5,
			'pointer-events': 'none' // Hover events go to counties
		});
}

// Update the drawn US to show a date/key pair
export function update(data, date, key) {
	currentKey = key;
	currentDate = date;

	svg
		.select('.county')
		.selectAll('path')
		.each(function (d) {
			const path = d3.select(this);
			const fips = fipsFilter(d.id);
			let dataPoint = data?.[date]?.[fips]?.[key] || '0';
			dataPoint = Number.parseInt(dataPoint, 10);
			if (dataPoint < 0) {
				dataPoint = 0;
			}

			path
				.transition()
				.duration(transChange)
				.style({
					fill: color(dataPoint + 1),
					stroke: 'black'
				});
		}
		);
}

// Update the status line in the svg
export function setStatusLine(text) {
	statusLine.text(text);
}

// Do things!
buildScreen();
model.us.then(drawUS);
