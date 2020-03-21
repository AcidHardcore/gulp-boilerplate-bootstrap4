/**
 * Settings
 * Turn on/off build features
 */

var settings = {
  clean: true,
  scripts: true,
  libs: true,
  polyfills: true,
  styles: true,
  svgs: true,
  sprite: true,
  images: true,
  copy: true,
  reload: true
};


/**
 * Paths to project folders
 */

var paths = {
  input: 'src/',
  output: 'dist/',
  scripts: {
    input: 'src/js/*',
    polyfills: '.polyfill.js',
    output: 'dist/js/'
  },
  libs: {
    input: 'src/libs/*',
    output: 'dist/js/'
  },
  styles: {
    input: 'src/sass/**/*.{scss,sass}',
    output: 'dist/css/'
  },
  images: {
    input: 'src/img/**/*.{jpg,jpeg,gif,png}',
    output: 'dist/img/'
  },
  svgs: {
    input: 'src/svg/*.svg',
    output: 'dist/img/'
  },
  copy: {
    input: 'src/copy/**/*',
    output: 'dist/'
  },
  reload: './dist/'
};


/**
 * Template for banner to add to file headers
 */

var banner = {
  main:
    '/*!' +
    ' <%= package.name %> v<%= package.version %>' +
    ' | (c) ' + new Date().getFullYear() + ' <%= package.author.name %>' +
    ' | <%= package.license %> License' +
    ' | <%= package.repository.url %>' +
    ' */\n'
};


/**
 * Gulp Packages
 */

// General
var {gulp, src, dest, watch, series, parallel} = require('gulp');
var del = require('del');
var flatmap = require('gulp-flatmap');
var lazypipe = require('lazypipe');
var rename = require('gulp-rename');
var header = require('gulp-header');
var package = require('./package.json');

// Scripts
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var concat = require('gulp-concat');
var uglify = require('gulp-terser');
var optimizejs = require('gulp-optimize-js');

// Styles
var sass = require('gulp-sass');
var postcss = require('gulp-postcss');
var prefix = require('autoprefixer');
var minify = require('cssnano');
var mqpacker = require("css-mqpacker");
var inlineSVG = require('postcss-inline-svg');

// SVGs
var svgmin = require('gulp-svgmin');
var svgstore = require('gulp-svgstore');

//Images
var imagemin = require('gulp-imagemin');

// BrowserSync
var browserSync = require('browser-sync');


/**
 * Gulp Tasks
 */

// Remove pre-existing content from output folders
var cleanDist = function (done) {

  // Make sure this feature is activated before running
  if (!settings.clean) return done();

  // Clean the dist folder
  del.sync([
    paths.output
  ]);

  // Signal completion
  return done();

};

// Repeated JavaScript tasks
var jsTasks = lazypipe()
  .pipe(header, banner.main, {package: package})
  .pipe(optimizejs)
  .pipe(dest, paths.scripts.output)
  .pipe(rename, {suffix: '.min'})
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, {package: package})
  .pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
var buildScripts = function (done) {

  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Run tasks on script files
  return src(paths.scripts.input)
    .pipe(flatmap(function (stream, file) {

      // If the file is a directory
      if (file.isDirectory()) {

        // Setup a suffix variable
        var suffix = '';

        // If separate polyfill files enabled
        if (settings.polyfills) {

          // Update the suffix
          suffix = '.polyfills';

          // Grab files that aren't polyfills, concatenate them, and process them
          src([file.path + '/*.js', '!' + file.path + '/*' + paths.scripts.polyfills])
            .pipe(concat(file.relative + '.js'))
            .pipe(jsTasks());

        }

        // Grab all files and concatenate them
        // If separate polyfills enabled, this will have .polyfills in the filename
        src(file.path + '/*.js')
          .pipe(concat(file.relative + suffix + '.js'))
          .pipe(jsTasks());

        return stream;

      }

      // Otherwise, process the file
      return stream.pipe(jsTasks());

    }));

};

// Lint scripts
var lintScripts = function (done) {

  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Lint scripts
  return src(paths.scripts.input)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));

};

// Process, lint, and minify Sass files
var buildStyles = function (done) {

  // Make sure this feature is activated before running
  if (!settings.styles) return done();

  // Run tasks on all Sass files
  return src(paths.styles.input)
    .pipe(sass({
      includePaths: ['node_modules/bootstrap/scss/'],
      outputStyle: 'expanded',
      sourceComments: true
    }))
    .pipe(postcss([
      prefix({
        cascade: true,
        remove: true
      }),
      mqpacker({
        sort: true
      }),
      inlineSVG()
    ]))
    .pipe(header(banner.main, {package: package}))
    .pipe(dest(paths.styles.output))
    .pipe(rename({suffix: '.min'}))
    .pipe(postcss([
      minify({
        discardComments: {
          removeAll: true
        }
      })
    ]))
    .pipe(dest(paths.styles.output));

};

// Optimize SVG files
var buildSVGs = function (done) {

  // Make sure this feature is activated before running
  if (!settings.svgs) return done();

  // Optimize SVG files
  return src(paths.svgs.input)
    .pipe(svgmin())
    .pipe(dest(paths.svgs.output));

};

//make SVG sprite
var svgSprite =  function (done) {

  // Make sure this feature is activated before running
  if (!settings.sprite) return done();

  return src(paths.svgs.input)
    .pipe(svgmin(function (file) {
      return {
        plugins: [{
          cleanupIDs: {
            minify: true
          }
        }]
      }
    }))
    .pipe(svgstore({inlineSvg: true}))
    .pipe(rename('sprite.svg'))
    .pipe(dest(paths.svgs.output));
};

// Copy static files into output folder
var images = function (done) {

  // Make sure this feature is activated before running
  if (!settings.images) return done();

  // optimize images
  return src(paths.images.input)
    .pipe(imagemin([
      imagemin.gifsicle({interlaced: true}),
      imagemin.mozjpeg({quality: 70, progressive: true}),
      imagemin.optipng({optimizationLevel: 5}),
    ]))
    .pipe(dest(paths.images.output));

};

var copyFiles = function (done) {

  // Make sure this feature is activated before running
  if (!settings.copy) return done();

  // Copy static files
  return src(paths.copy.input)
    .pipe(dest(paths.copy.output));

};

var copyJSLibs = function (done) {

  // Make sure this feature is activated before running
  if (!settings.libs) return done();

  // Copy static files
  return src(paths.libs.input)
    .pipe(dest(paths.libs.output));

};

// Watch for changes to the src directory
var startServer = function (done) {

  // Make sure this feature is activated before running
  if (!settings.reload) return done();

  // Initialize BrowserSync
  browserSync.init({
    server: {
      baseDir: paths.reload
    }
  });

  // Signal completion
  done();

};

// Reload the browser when files change
var reloadBrowser = function (done) {
  if (!settings.reload) return done();
  browserSync.reload();
  done();
};

// Watch for changes
var watchSource = function (done) {
  watch(paths.scripts.input, series(exports.scripts, reloadBrowser));
  watch(paths.styles.input, series(exports.styles, reloadBrowser));
  watch([paths.svgs.input, paths.images.input], series(exports.assets, reloadBrowser));
  watch(paths.copy.input, series(exports.copyFiles, reloadBrowser));
  done();
};


/**
 * Export Tasks
 */

// Default task
// gulp
exports.default = series(
  cleanDist,
  parallel(
    buildScripts,
    lintScripts,
    buildStyles,
    buildSVGs,
    svgSprite,
    images,
    copyFiles,
    copyJSLibs
  )
);

// Watch and reload
// gulp watch
exports.watch = series(
  exports.default,
  startServer,
  watchSource
);

//Build and link scripts
exports.scripts = parallel(
  buildScripts,
  lintScripts,
);

//Compile styles
exports.styles = buildStyles;

exports.assets = series(
  buildSVGs,
  svgSprite,
  images
);

//Copy files
exports.copyFiles = copyFiles;






