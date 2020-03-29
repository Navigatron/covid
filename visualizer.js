'use strict';

// default map size
let width = 960;
let height = 600;

// color - map from value to color
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

// What color are undefined counties?
let colorUndefined = "#F1F1F1";

let colorRange = Object.keys(colorMap).map(a=>parseInt(a)+1)
console.log('Color Range', colorRange);

// number to color conversion function
var color = d3.scale.log()
	.domain(colorRange) // add one to account for log scale
	.range(Object.values(colorMap));

// DomObject - tooltip
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

	// .call(d3.behavior.zoom().on("zoom", function () {
	// 	svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
	// }));

// Create the 'path' function, for GeoJson data
var path = d3.geo.path();

// Pull down data files, run ready when data acquired.
queue()
	.defer(d3.json, "us.json")
	.defer(d3.csv, "03-28-2020.csv")
	.await(ready);

// Unused function to just draw the US
function ready(error, us, data) {
	// Aight here's what we got:
	// - div: the tooltip
	// - color: a function to turn a number to a color
	// - svg: The svg element on the page
	// - path: A geo-pathy thing? function, data -> path
	// - us: the united states geo-json
	// - data: the csv of case counts

	// Mappings of IDs to data about the IDs.
	var pairRateWithId = {};
	var pairNameWithId = {};



	// Kinda turn that csv into json
	data.forEach(function(d) {
		pairRateWithId[d.FIPS] = +d.Confirmed;
		// IDs are given a rate variable
		pairNameWithId[d.FIPS] = d.Admin2;
		// IDs are given a *name* variable
		//console.log('Processing ', d);
	});

	//console.log(pairRateWithId);

	// Append a 'g' element to the svg (a group!)
	svg.append("g")
		// We are now operating on the group
		// Set an attribute - this group has counties
		.attr("class", "county")
		// This is where the zoom should be, because we only want to zoom this part
		// Move from the group to 'paths' within the group - that may or may not exist
		.selectAll("path")
		// This applies the US data to the selection
		.data(topojson.feature(us, us.objects.counties).features)
		// ENTER kinda selects the elements that are being added
		// Things that are going in that aren't in yet
		.enter()
		// Append a path item to the group
		.append("path")
		// Set the actual path data of this path, via our path function
		.attr("d", path)
		// Set the fill style of the path (county)
		.style ( "fill" , function (d) {
			if(pairRateWithId[d.id] === undefined){
				return colorUndefined;
			}
			return color (pairRateWithId[d.id]+1); // convert the ID's rate to a color. Color is a function that takes a number and returns a color
			// Plus 1 is in there to counter the log limitation of all values positive
		})
		.style("stroke-width", function(d){
			if(pairRateWithId[d.id] === undefined){
				return 0.1;
			}
			return 0.1;
		})
		.style("stroke", function(d){
			if(pairRateWithId[d.id] === undefined){
				return colorUndefined;
			}
			return "black";
		})
		// Do this when we hover over a county
		.on("mouseover", function(d) { // This creates the hover dialog // commented to make faster
			var sel = d3.select(this);
			sel.moveToFront();

			d3.select(this).transition().duration(300).style({'stroke': 'black', 'stroke-width': 1});

			div.transition().duration(300)
			.style("opacity", 1);

			// show the tooltip
			div.text(d.id + ": " + pairNameWithId[d.id] + ": " + pairRateWithId[d.id])
			.style("left", (d3.event.pageX+10) + "px")
			.style("top", (d3.event.pageY -30) + "px");
		})
		// un-hover
		.on("mouseout", function() {

			// move 'this' to the back
			var sel = d3.select(this);
			sel.moveToBack();

			// Fade the county back in/out?
			d3.select(this)
				.transition()
				.duration(300)
				.style({'opacity': 1, 'stroke': 'black', 'stroke-width': 0.1});

			// Make the tooltip transparent
			div.transition()
				.duration(300)
				.style("opacity", 0);
		})


	// Append a 'g' element to the svg (a group!)
	svg.append("g")
		// We are now operating on the group
		// Set an attribute - this group has states
		.attr("class", "state")
		// Move from the group to 'paths' within the group - that may or may not exist
		.selectAll("path")
		// This applies the US data to the selection
		.data(topojson.feature(us, us.objects.states).features)
		// ENTER kinda selects the elements that are being added
		// Things that are going in that aren't in yet
		.enter()
		// Append a path item to the group
		.append("path")
		// Set the actual path data of this path, via our path function
		// path function takes the data from the .data and returns the shape
		.attr("d", path)
		// set some more style things
		.style({'opacity': 1, 'fill': 'cyan', 'fill-opacity': 0, 'stroke': 'black', 'stroke-width': 0.5, 'pointer-events': 'none'})

};

// add some functionality to d3 selections - this is illegal

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
			d3.select(this).transition().duration(300).style({'stroke': 'black', 'stroke-width': 1});

			// Make the tooltip show up
			div.transition().duration(300).style("opacity", 1);

			// populate the tooltip
			// each county shall have associated data in json array
			div.text('unknown')
			.style("left", (d3.event.pageX+10) + "px")
			.style("top", (d3.event.pageY -30) + "px");
		})
		// un-hover
		.on("mouseout", function() {

			// move 'this' to the back
			var sel = d3.select(this);
			sel.moveToBack();

			// Fade the county back in/out?
			d3.select(this)
				.transition()
				.duration(300)
				.style({'opacity': 1, 'stroke': 'black', 'stroke-width': 0.1});

			// Make the tooltip transparent
			div.transition()
				.duration(300)
				.style("opacity", 0);
		})
}

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
