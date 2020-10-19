const path = require('path');

module.exports = {
	entry: './src/controls.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'docs'),
	},
	optimization: {
        // minimize: false
    },
};
