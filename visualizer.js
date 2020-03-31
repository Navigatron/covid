'use strict';

// When the page loads, what data do we show first?
let defaultDataDate = "03-30-2020";

// default map size
let width = 960;
let height = 600;

// color - map from value to color
// created using hclwizard
let colorMap = {
	10000:"#4A007E",
	3162:"#790887",
	1000:"#A21E8C",
	316:"#C63A8B",
	100:"#E55A7E",
	32:"#F98067",
	10:"#FEA95D",
	3:"#FFCF6E",
	1:"#FDF39E",
	0:"#D1FFA9"
};

// What color are undefined counties? (light gray)
let colorUndefined = "#F1F1F1";

// Create a function to turn a count into a color
var color = d3.scale.log()
	.domain(Object.keys(colorMap).map(a=>parseInt(a)+1)) // add one to account for log scale
	.range(Object.values(colorMap));

// Create the toolip object
var div = d3.select("body")
	.append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

// Create the svg, set some attributes
var svg = d3.select("#map").append("svg")
	.attr("width", width)
	.attr("viewBox", "0 0 "+width+" "+height)
	.attr("height", height)
	.style("max-width", "100%")
	.style("height", "100%")
	.style("margin", "0px auto");

// Zoom is going to be a little tough
// .call(d3.behavior.zoom().on("zoom", function () {
// 	svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
// }));

// Create the 'path' function, for GeoJson data
var path = d3.geo.path();

// What keys we will show in the legend
let legendKeys = [0,1,2,5,10,20,50,100,200,500, 1000,2000,5000,10000];

// The Legend is a d3 selection of legend objects - there are many
var legend = svg.selectAll("g.legend")
	// binds together the data and the selection
	.data(legendKeys)
	// Tell how to create a new thing if there's too much data
	.enter() // wtf does this do again
	// to make a legend, append a group with the legend class.
	.append("g")
	.attr("class", "legend");

// Legend Sample Width and Legend Sample Height
var ls_w = width/legendKeys.length;
var ls_h = 20;

// Legend Rectangles.
legend.append("rect")
	.attr("x", function(d, i){ return (i*ls_w);})
	.attr("y", 550)
	.attr("width", ls_w)
	.attr("height", ls_h)
	.style("fill", function(d, i) { return color(d+1); }) // the plus one is for the log scale
	.style("stroke-width", 0.5)
	.style("stroke", "black")

// Legend Text
legend.append("text")
	.attr("x", function(d, i){ return (i*ls_w);})
	.attr("y", 590)
	.text(function(d, i){ return ""+d; });

// Trigger a map change when we click a button
d3.selectAll('button').on("click", function(){
	loadDate(d3.select(this).attr("data-date"));
});

// Kick-off this party by drawing the blank US.
queue()
	.defer(d3.json, "us.json")
	.await(drawUS);

// There are only scary things below this point.

// Scary thing #1 - prototyple polution.
// Moves selction to front
d3.selection.prototype.moveToFront = function() {
	return this.each(
		function(){
			this.parentNode.appendChild(this);
		}
	);
};

// Moves selction to back
d3.selection.prototype.moveToBack = function() {
	return this.each(function() {
		var firstChild = this.parentNode.firstChild;
		if (firstChild) {
			this.parentNode.insertBefore(this, firstChild);
		}
	});
};

// This function takes GeoJson data and draws the map of the US
function drawUS(error, us){
	// Add Counties
	svg.append("g")
		.attr("class", "county")
		.selectAll("path")
		.data(topojson.feature(us, us.objects.counties).features)
		.enter()
		.append("path")
		.attr("d", path)
		.style ( "fill" , colorUndefined)
		.style("stroke-width", 0.1)
		.style("stroke", colorUndefined)
		// Do this when we hover over a county
		.on("mouseover", function(d) {
			// Move this county to the front of all counties?
			var sel = d3.select(this);
			sel.moveToFront();

			// Outline this county
			sel.transition().duration(300).style({'stroke': 'black', 'stroke-width': 0.5});

			// Make the tooltip show up
			div.transition().duration(300).style("opacity", 1);

			// populate the tooltip
			// each county shall have associated data in json array
			// div.text(d.id + ": " + pairNameWithId[d.id] + ": " + pairRateWithId[d.id])
			let name = sel.attr("data-name");
			let count = sel.attr("data-count");
			let text = "no data";
			if(name && count){
				text = name+": "+count;
			}
			div.text(text)
			.style("left", (d3.event.pageX+10) + "px")
			.style("top", (d3.event.pageY -30) + "px");
		})
		// un-hover
		.on("mouseout", function() {
			// move 'this' to the back
			var sel = d3.select(this);
			sel.moveToBack();

			// by default, consider the county undefined.
			let scolor = colorUndefined;
			// counties with data get black borders.
			if(sel.attr("data-count")){
				scolor = "black";
			}

			// Fade the county back in
			sel
				.transition()
				.duration(300)
				.style({'stroke': scolor, 'stroke-width': 0.1});

			// Make the tooltip transparent
			div.transition()
				.duration(300)
				.style("opacity", 0);
		});
	// State borders
	svg.append("g")
		.attr("class", "state")
		.selectAll("path")
		.data(topojson.feature(us, us.objects.states).features)
		.enter()
		.append("path")
		.attr("d", path)
		.style({
			'opacity': 1,
			'fill-opacity': 0,
			'stroke': 'black',
			'stroke-width': 0.5,
			'pointer-events': 'none' // hover events go to counties
		});
	// Part of drawing the US for the first time is populating with the default
	loadDate(defaultDataDate);
}

// takes a string in MM-DD-YYYY format, because that's what john hopkins uses :(
// Loads that csv, and triggers a map update.
function loadDate(date){
	// update date display indicator
	d3.select("#cdate").text(date);
	// load that data, pipe to map updater
	queue()
		.defer(d3.csv, "data/"+date+".csv")
		.await(showDate);
}

// use d3.csv to parse jh data, then drop that in here to show on the map.
// This does the map update
function showDate(error, data){
	// csv data to json-like data
	let jdata = {};
	data.forEach(function(d) {
		jdata[""+d.FIPS] = {
			name: d.Admin2,
			count: +d.Confirmed
		};
	});

	svg.select('.county').selectAll('path').each(function(d, i){
		// d is an object
		// we need to get its id: d.id, YES

		// Re-add the leading zero to county ID codes
		let fips = d.id;
		if((""+fips).length===4){
			fips = '0'+fips;
		}

		let myData = jdata[fips];
		let path = d3.select(this);
		if(myData){
			// set the easy ones
			path
				.attr("data-name", myData.name)
				.attr("data-count", myData.count)
				.style("stroke", "black");
			// Transition to the new fill color
			path
				.transition()
				.duration(300)
				.style("fill", color(myData.count+1));
		}else{
			path
				.style("fill", colorUndefined)
				.style("stroke", colorUndefined);
		}
	});
}
