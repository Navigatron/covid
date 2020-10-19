import * as d3 from 'd3-dsv';

const getFile = async (filename, progressCB = () => {}) => {
	const response = await fetch(filename);
	const reader = response.body.getReader();
	const contentLength = Number(response.headers.get('Content-Length'));
	// How many bytes recieved
	let receivedLength = 0;
	// Array of chunks recieved
	const chunks = [];
	// Consume chunks
	while (true) {
		const {done, value} = await reader.read();
		if (done) {
			break;
		}

		chunks.push(value);
		receivedLength += value.length;
		progressCB({have: receivedLength, total: contentLength});
	}

	// Turn array of chunks into one chunk, as utf-8 string.
	const chunksAll = new Uint8Array(receivedLength);
	let position = 0;
	for (const chunk of chunks) {
		chunksAll.set(chunk, position);
		position += chunk.length;
	}

	return new TextDecoder('utf-8').decode(chunksAll);
};

const getNames = async () => {
	const raw = await getFile('/names.csv');
	const namesMap = {};
	d3.csvParse(raw).forEach(row => {
		namesMap[row.fips] = row.name;
	});
	return namesMap;
};

const getUS = async () => {
	const raw = await getFile('/us.json');
	return JSON.parse(raw);
};

const getData = async pcb => {
	const raw = await getFile('/data.csv', pcb);
	const datasetMap = {};
	d3.csvParse(raw).forEach(row => {
		if (!datasetMap[row.date]) {
			datasetMap[row.date] = {};
		}

		if (!datasetMap[row.date][row.fips]) {
			datasetMap[row.date][row.fips] = {};
		}

		datasetMap[row.date][row.fips] = {
			cases: row.cases,
			cases_new: row.cases_new,
			deaths: row.deaths,
			deaths_new: row.deaths_new,
			rs14: row.rs14
		};
	});
	return datasetMap;
};

const model = {
	get names() {
		delete this.names;
		return this.names = getNames(); // Promise
	},
	get us() {
		delete this.us;
		return this.us = getUS();
	},
	get data() {
		delete this.data;
		return this.data = getData(this._pcb);
	},
	set progressFunc(func) {
		// Something something make sure it's a function
		this._pcb = func;
	}
};

export {model};
