const gulp = require('gulp');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const htmlmin = require('gulp-htmlmin');
const cleanCSS = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const less = require('gulp-less');


const javascript = () => new Promise((resolve, reject) => {
	webpack(webpackConfig, (err, stats) => {
		if (err) {
			return reject(err)
		}
		if (stats.hasErrors()) {
			return reject(new Error(stats.compilation.errors.join('\n')))
		}
		resolve()
	});
});

const html = () => gulp.src('src/*.html')
	.pipe(htmlmin({collapseWhitespace: true}))
	.pipe(gulp.dest('docs/'));

const style = () => gulp.src('src/*.less')
	.pipe(less())
	.pipe(autoprefixer())
	.pipe(cleanCSS())
	.pipe(gulp.dest('docs/'));

const copyCSV = () => gulp.src('src/data/*.csv')
	.pipe(gulp.dest('docs/'));

const copyJSON = () => gulp.src('src/data/*.json')
	.pipe(gulp.dest('docs/'));

const copyPNG = () => gulp.src('src/**/*.png')
	.pipe(gulp.dest('docs/'));

const copy = gulp.parallel(copyCSV, copyJSON, copyPNG);

// export a build task that runs the above two tasks in series
module.exports.build = gulp.parallel(javascript, html, style, copy);
