
import {model} from './model';
import * as view from './view';

// Constants
const dataSize = 35036760;
const animationSpeed = 250; // Lower is faster
const keys = {
	cases: {
		display: 'Total Cases',
		transition: 'as of'
	},
	cases_new: {
		display: 'New Cases',
		transition: 'on'
	},
	deaths: {
		display: 'Total Deaths',
		transition: 'as of'
	},
	deaths_new: {
		display: 'New Deaths',
		transition: 'on'
	},
	rs14: {
		display: 'Two-Week Total',
		transition: 'as of'
	}
};

// A little bit of state
let currentDate;
let currentKey = 'rs14';
let animationTimer;
let isAnimating = false;

// Utility function, from stamps to strings and back
const dateStampToString = d => {
	return new Date(d * 1000 * 86400).toISOString().slice(0, 10);
};

// References to common elements
const inDate = document.querySelector('#inDate');
const inKey = document.querySelector('#inKey');
const inAnimate = document.querySelector('#inAnimate');
const outCtran = document.querySelector('#outCtran');
const outCdate = document.querySelector('#outCdate');
const outEdate = document.querySelector('#outEdate');

// Utility - update the view with what you've got
function update(date = currentDate, key = currentKey) {
	currentDate = date;
	currentKey = key;
	// Update lower status line
	outCtran.textContent = keys[key].transition;
	outCdate.textContent = dateStampToString(date);
	// Update actual map
	model.data.then(data => {
		// Update status line
		view.setStatusLine(
			`${keys[key].display} ${keys[key].transition} ${dateStampToString(date)}`
		);
		view.update(data, date, key);
	});
}

// Some animation-related functions
function stopAnimating() {
	isAnimating = false;
	inAnimate.textContent = 'Animate';
	clearTimeout(animationTimer);
}

function frame() {
	const newDate = Number.parseInt(inDate.value, 10) + 1;
	inDate.value = newDate;
	if (String(newDate) === inDate.getAttribute('max')) {
		stopAnimating();
	} else {
		animationTimer = setTimeout(frame, animationSpeed);
	}

	update(newDate);
}

// Wire up the controls to event handlers
function main() {
	// Date Input -> Display new Date
	inDate.addEventListener('change', event => {
		update(event.target.value);
	});
	// Key Input -> Display new Key
	inKey.addEventListener('change', event => {
		update(undefined, event.target.value);
	});
	// Animate Button - Play/Pause animation
	inAnimate.addEventListener('click', () => {
		if (isAnimating) {
			stopAnimating();
		} else {
			isAnimating = true;
			inAnimate.textContent = 'Pause';
			if (inDate.value === inDate.getAttribute('max')) {
				const newDate = inDate.getAttribute('min');
				inDate.value = newDate;
				update(newDate);
				animationTimer = setTimeout(frame, animationSpeed);
			} else {
				frame();
			}
		}
	});
	// Set the model's progress function
	model.progressFunc = prog => {
		const percent = Math.round(prog.have / dataSize * 100);
		if (percent === 100) {
			view.setStatusLine('Processing...');
		} else {
			view.setStatusLine(`Loading (${percent}%)`);
		}
	};

	// Populate the slider when ready
	model.data.then(data => {
		const maxDate = Object.keys(data).sort((a, b) => b - a)[0];
		inDate.setAttribute('max', maxDate);
		inDate.setAttribute('value', maxDate);
		outEdate.textContent = new Date(maxDate * 1000 * 86400).toLocaleString('default', {month: 'long', day: 'numeric', timeZone: 'UTC'});
		update(maxDate);
	});
}

main();
