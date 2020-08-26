'use strict';

// When the page loads, what data do we show first?
let defaultDisplayDate = "2020-08-25";
let defaultDisplayDateDisplay = "August 25th";
let datacsvFileSize = 12681821; // used by loading indicator

let keys = {
	"cases": {
		"display": "Total Cases",
		"transition": "as of"
	},
	"cases_new": {
		"display": "New Cases",
		"transition": "on"
	},
	"deaths": {
		"display": "Total Deaths",
		"transition": "as of"
	},
	"deaths_new": {
		"display": "New Deaths",
		"transition": "on"
	},
	"rs14": {
		"display": "RS14 Index",
		"transition": "on"
	}
};

let currentDate = defaultDisplayDate;
let getCurrentDate = () => {
	return currentDate;
};

let currentKey = "cases";
let getCurrentKey = ()=>{
	return currentKey;
};

// default map size
let width = 960;
let height = 600;

// color - map from value to color
// created using hclwizard
let colorMap = {
	316228:	"#0D101D", // I'm... not sure what to think anymore.
	100000:	"#27193F", // I'm surprised it's come to this.
	31623:	"#4A1B59",
	10000:	"#6F1A6C",
	3162:	"#941E76",
	1000:	"#B62C76",
	316:	"#D3446A",
	100:	"#E8644E",
	32:		"#EB8B41",
	10:		"#EDAF50",
	3:		"#EFD176",
	1:		"#F6F5A6",
	0:		"#CFFEB2", // 2020-07-12 : loss of distinction between 0 and 1 for colorblind
};

// The magic number is 316228

// What color are undefined counties? (light gray)
let colorUndefined = "#F1F1F1";

// How fast will we transition between colors?
let transitionTime = 50;

// counts of cases - populated by main.
let dataset;

// ------------------------------------ d3 -------------------------------------

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

// Here's some stuff for the legend

// What keys we will show in the legend
let legendKeys = [0,1,2,5,10,20,50,100,200,500, 1000,2000,5000,10000,20000,50000,100000,200000];

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

// --------------------------------- Controls ----------------------------------

let statusLine = svg.append("text")
	.attr("x", "50%")
	.attr("y", "20px")
	.attr("text-anchor", "middle")
	.text("Loading Data...");

let setStatusLine = function(input){
	statusLine.text(input);
};

// Trigger a map change when we click a button
d3.select('#dateInput').on("input", function(){
	// Get the desired date from the button
	let datestring = new Date(this.value*1000).toISOString().substr(0,10);
	setDate(datestring);
});

d3.select('#animateButton').on('click', function(){
	animate();
})

// Trigger a key change when we... change keys
d3.select('#key_settr').on("input", function(){
	// Get the desired date from the button
	setKey(this.value);
});

// For when a control changes the key
let setKey = (keyName) => {
	currentKey = keyName;
	fullUpdate(dataset, getCurrentDate(), keyName);
};
// For when a control/animation changes the date
let setDate = (datestring, updateControls) => {
	currentDate = datestring;
	fullUpdate(dataset, currentDate, getCurrentKey());
	if(updateControls){
		d3.select('#dateInput').property("value", new Date(Date.parse(datestring)).getTime()/1000);
	}
};

// Update everything. There are a few components in this.
let fullUpdate = (dataset, datestring, keyName) => {
	let keyDisplay = keys[keyName].display;
	let keyTransition = keys[keyName].transition;
	updateMap(dataset, datestring, keyName);
	setStatusLine(keyDisplay + " " + keyTransition + " " + datestring);
	setSecondStatusLine(keyTransition+" "+datestring);
};

let setSecondStatusLine = (line) => {
	d3.select('#cdate').text(line);
};

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

// Moves selection to back
d3.selection.prototype.moveToBack = function() {
	return this.each(function() {
		var firstChild = this.parentNode.firstChild;
		if (firstChild) {
			this.parentNode.insertBefore(this, firstChild);
		}
	});
};

// Functions go below here

// return promise that resolves to US geoJson data
async function loadUS(){
	return new Promise((resolve, reject)=>{
		queue()
			.defer(d3.json, "us.json")
			.await(function(err, us){
				if(err) reject(err);
				resolve(us);
			});
	})
}

// This function takes GeoJson data and draws the map of the US
function drawUS(us){

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

			// populate the tooltip, based on the counties data attributes.
			let name = sel.attr("data-name");
			let count = sel.attr("data-count");

			let text = "no data";
			//if(name && count){
			text = name+": "+count;
			// todo - return this to fail gracefully, rather than informatively.
			//}
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

			// Fade the border back out.
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
	// this is all that this function shall do
}

function progressCSV(filename, callback){
	// load the filename, and provide it to the callback
	d3.csv(filename, callback).on("progress", ()=>{
		setStatusLine("Loading ("+Math.round(d3.event.loaded/datacsvFileSize*100)+"%)");
	});
}

// Given a csv filename, return the contents of that file.
async function loadCSV(filename){
	return new Promise((resolve, reject)=>{
		queue()
			.defer(progressCSV, filename)
				// d3.csv takes filename, callback
				// calls callback with error, result
			.await(function(err,data){
				if(err) reject(err);
				resolve(data);
			});
	});
}

// Return an object {fipscode: countyName, ...}
async function loadNames(){
	// The data is stored in csv because it is smaller
	let namesArray = await loadCSV("names.csv");
	// convert it to a better json structure
	let namesMap = {};
	namesArray.forEach(row=>{
		namesMap[row.fips] = row.name;
	});
	return namesMap;
}

// Given a map {fips: countyName, ...} - apply to US.
// requires that counties exist in the map.
function applyNames(names){
	svg.select('.county').selectAll('path').each(function(d, i){
		// Re-add the leading zero to county ID codes
		let fips = d.id;
		if((""+fips).length===4){
			fips = '0'+fips;
		}
		// when we encounter county 46113, treat it as 46102
		if(''+fips==='46113'){
			fips = '46102';
		}
		// get the county
		let path = d3.select(this);
		if(names[fips]){
			// set the name attribute for this county
			path.attr("data-name", names[fips]);
		}else{
			path.attr("data-name", "unrecognized fips");
		}
	});
}

async function loadDataset(){
	let datasetArray = await loadCSV("data.csv");
	// convert to json lookup structure
	let datasetMap = {};
	datasetArray.forEach(row=>{
		if(!datasetMap[row.date]) datasetMap[row.date] = {};
		if(!datasetMap[row.date][row.fips]) datasetMap[row.date][row.fips] = {};
		datasetMap[row.date][row.fips] = {
			cases: row.cases,
			cases_new: row.cases_new,
			deaths: row.deaths,
			deaths_new: row.deaths_new,
			rs14: row.rs14
		};
	});
	return datasetMap;
}

// Update the map to show a given key on a given date
function updateMap(dataset, datestring, key){

	// Iterate over each county on the map
	svg.select('.county').selectAll('path').each(function(d, i){

		// This is the 'path' object, used for coloring the county.
		let path = d3.select(this);

		// Get the FIPS code for this county
		let fips = d.id;
		// ... and compensate for fips problems.
		if((""+fips).length===4){
			fips = '0'+fips;
		}
		// There is a single south-dakota county that changed fips code
		// when we encounter county 46113 (old), treat it as 46102 (new)
		if(''+fips==='46113'){
			fips = '46102';
		}

		// Extract the dataPoint of choice
		let dataPoint = dataset[datestring][fips];
		if(dataPoint){dataPoint=dataPoint[key]}else{dataPoint=0} // hack

		// Replace negative deltas with green
		dataPoint = parseInt(dataPoint);
		if(dataPoint<0) dataPoint=0;

		// Color values for the county
		let newColor = color(parseInt(dataPoint)+1);
		let newStrokeColor = "black";

		// set the silly data-count attribute on the county,
		// such that the tooltip can display correctly on hover.
		path.attr("data-count", dataPoint);
		// TODO - I would really like to do this differently.

		// Apply the color-changes
		path
			.transition()
			.duration(transitionTime)
			.style({"fill": newColor, "stroke": newStrokeColor});
	});
}

// No-longer-secret Animation function
function animate(){

	// A few constants to help things out
	let theBeginningOfTime = new Date(Date.parse('2020-03-01')).getTime();
	let theEndofTime = new Date(Date.parse(defaultDisplayDate)).getTime();
	let oneSingleDay = 60 * 60 * 24 * 1000;

	// Array of dates to show - we no longer populate this manually lol.
	let dates = [];

	// Iterate over all of time to populate the list of dates
	for (var i = theBeginningOfTime; i <= theEndofTime; i+=oneSingleDay) {
		dates.push(new Date(i).toISOString().substr(0,10));
	}

	// Show a given index in the dates array, then the next one, then...
	let showIndex = i => {
		setDate(dates[i], true); // the true updates the date controls
		if(i<dates.length-1){
			setTimeout(()=>{showIndex(i+1)}, transitionTime);
		}
	};

	// Kick it off with the first one.
	showIndex(0);

	// There's a much better way to do this but ya know how it is
	// we'll get there eventually

	// 2 months later, I'm embarrased to say I wrote this.
	// This could be so much better.
	// But for now it works, and I've got bigger fish to fry
	// lol
}

// set the global state?

// updateController
// updateControllerAndView
// updateView

async function main(){
	// Get the US data
	let usaDataPromise = loadUS();
	// Get the names data
	let namesPromise = loadNames();
	// Get the case count dataset
	let datasetPromise = loadDataset();

	// When the usa data gets here, draw it.
	let usaDrawnPromise = usaDataPromise.then(us=>drawUS(us));

	// Wait for the usa to be drawn.
	await usaDrawnPromise;

	// Now that the counties are there, apply the names and the case counts.
	namesPromise.then(names=>applyNames(names));
	let dataInPromise = datasetPromise.then(data=>{
		// save this for later
		dataset = data;
		setDate(defaultDisplayDate, true);
		d3.select('#dateInput').property("max", new Date(Date.parse(defaultDisplayDate)).getTime()/1000);
		d3.select('#dateInput').property("value", new Date(Date.parse(defaultDisplayDate)).getTime()/1000);
		d3.select('#edate').text(defaultDisplayDateDisplay);
	});

	// Once the data is in, set the status line?
	dataInPromise.then(()=>{
		// once the map is colored, set the display indicator.
		// d3.select('#cdate').text(defaultDisplayDate);
	});
}

main();
