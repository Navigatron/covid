'use strict';

// When the page loads, what data do we show first?
let defaultDisplayDate = "2020-04-02";

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

// How fast will we transition between colors?
let transitionTime = 300;

// Somewhere to store the data.

// counts of cases - populated by main.
let dataset;

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
	// Get the desired date from the button
	let datestring = d3.select(this).attr("data-date");
	// show this date from the dataset
	applyDataset(dataset, datestring);
	// color the map
	recolor();
	// update the display date indicator
	d3.select('#cdate').text(datestring);
});



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

// Functions go below here

// loadUS
// drawUS



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

// loadNames
// applyNames

// Given a csv filename, return the contents of that file.
async function loadCSV(filename){
	return new Promise((resolve, reject)=>{
		queue()
			.defer(d3.csv, filename)
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

// loadDataset
// applyDataset(date)

async function loadDataset(){
	let datasetArray = await loadCSV("data.csv");
	// convert to json lookup structure
	let datasetMap = {};
	datasetArray.forEach(row=>{
		if(!datasetMap[row.date]) datasetMap[row.date] = {};
		if(!datasetMap[row.date][row.fips]) datasetMap[row.date][row.fips] = {};
		datasetMap[row.date][row.fips].confirmed = row.confirmed;
		datasetMap[row.date][row.fips].deaths = row.deaths;
	});
	return datasetMap;
}

// This does the map update, given a datestring as yyyy-mm-dd
function applyDataset(dataset, datestring){
	svg.select('.county').selectAll('path').each(function(d, i){
		// Re-add the leading zero to county ID codes
		let fips = d.id;
		if((""+fips).length===4){
			fips = '0'+fips;
		}

		// There is a single south-dakota county that changed fips code
		// when we encounter county 46113 (old), treat it as 46102 (new)
		if(''+fips==='46113'){
			fips = '46102';
		}

		let myData = dataset[datestring][fips];
		// either undefined, or {confirmed, deaths}
		let path = d3.select(this);
		if(myData !== undefined){
			path.attr("data-count", myData.confirmed)
		}else{
			// for now, do nothing here.
		}
	});
}

// Color each county based on the county's data-color attribute.
function recolor(){
	svg.select('.county').selectAll('path').each(function(){
		let path = d3.select(this);
		let count = path.attr('data-count');
		let newColor = colorUndefined;
		let newStrokeColor = colorUndefined;
		// console.log(count);
		if(count!==null){
			newColor = color(parseInt(count)+1); // account for log scale
			newStrokeColor = "black";
		}
		// apply over a transition time
		path
			.transition()
			.duration(transitionTime)
			.style({"fill": newColor, "stroke": newStrokeColor});
	})
}

// re-color the map with data from a given date.
// relies on dataset being loaded and map being drawn.
function showDate(datestring){
	applyDataset(dataset, datestring);
	recolor();
	d3.select('#cdate').text(datestring);
}

// secret animation function
function animate(){
	let dates = [
		'2020-03-23',
		'2020-03-24',
		'2020-03-25',
		'2020-03-26',
		'2020-03-27',
		'2020-03-28',
		'2020-03-29',
		'2020-03-30',
		'2020-03-31',
		'2020-04-01',
		'2020-04-02',
	];

	let index = 0;

	let showIndex = i => {
		showDate(dates[i]);
		if(i<dates.length-1){
			setTimeout(()=>{showIndex(i+1)}, transitionTime);
		}
	};

	showIndex(0);
}

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
		// get it in the map
		applyDataset(data, defaultDisplayDate);
	});

	// Once the data is in, perform the recolor
	dataInPromise.then(()=>recolor()).then(()=>{
		// once the map is colored, set the display indicator.
		d3.select('#cdate').text(defaultDisplayDate);
	});
}

main();

/*

// Only now that the map is drawn can we apply the names and counts.
// Load the dataset
queue()
	.defer(d3.csv, "data.csv")
	.await(loadData);

// Download the county names and apply them.
queue()
	.defer(d3.csv, "nameMap.csv")
	.await(applyNames);

	//.style("stroke", "black");
	// Transition to the new fill color
	path
	.transition()
	.duration(300)
	.style("fill", color(myData.confirmed+1));

*/
