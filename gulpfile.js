var gulp = require('gulp'),
  fs = require('fs'),
  path = require('path'),
  argv = require('yargs').argv,
  prefix = require('gulp-prefix'),
  clean = require('gulp-clean'),
  browserSync = require('browser-sync'),
  sass = require('gulp-sass')(require('sass')),
  autoprefixer = require('gulp-autoprefixer'),
  pug = require('gulp-pug'),
  notify = require('gulp-notify'),
  plumber = require('gulp-plumber'),
  gulpif = require('gulp-if'),
  replace = require('gulp-replace'),
  rename = require('gulp-rename'),
  l10n = require('gulp-l10n'),

  ngAnnotate = require('gulp-ng-annotate'),

  useref = require('gulp-useref'),
  uglify = require('gulp-uglify'),
  htmlmin = require('gulp-htmlmin'),
  cleanCss = require('gulp-clean-css'),
  _ = require('lodash'),
  ngConstant = require('gulp-ng-constant'),
  Vinyl = require('vinyl'),
  stream = require('stream'),
  nodemon = require('gulp-nodemon'),

  protractor = require('gulp-protractor');

var webdriver_standalone = protractor.webdriver_standalone;


var src = {
  jade: ['src/jade/*.jade', 'src/jade/templates/**/*.jade']
};

//the title and icon that will be used for the Grunt notifications
var notifyInfo = {
  title: 'Gulp'
};

//error notification settings for plumber
var plumberErrorHandler = {
  errorHandler: notify.onError({
    title: notifyInfo.title,
    message: 'Error: <%= error.message %>'
  })
};

// Clean temporary folders
gulp.task('clean', function () {
  return gulp.src(['./www', './.sass-cache'], {read: false, allowEmpty: true})
    .pipe(clean());
});

// SASS to CSS
gulp.task('build-styles', function () {
  return gulp.src('./src/sass/*.{sass,scss}')
    .pipe(plumber(plumberErrorHandler))
    .pipe(sass({
      outputStyle: argv.production ? 'compressed' : 'expanded',
      includePaths: ['src/sass', 'bower_components', '.'],
      silenceDeprecations: ['import', 'color-functions', 'slash-div', 'if-function', 'global-builtin']
    }).on('error', sass.logError))
    .pipe(autoprefixer({
      overrideBrowserslist: ['last 4 versions', 'ie 8'],
      cascade: false
    }))
    .pipe(gulp.dest('./www/css'));
});


// SVG to SVG sprites
gulp.task('copy-images', function () {
  return gulp.src(['./src/images/**/*', '!./src/images/icons/**/*'], {base: './src'})
    .pipe(gulp.dest('./www'));
});

// Static files
gulp.task('copy-statics', function () {
  return gulp.src(['./src/static/**/*'], {base: './src/static'})
    .pipe(gulp.dest('./www'));
});

// Scripts
gulp.task('copy-scripts', function () {
  return gulp.src(['./src/js/**/*'], {base: './src'})
    .pipe(gulp.dest('./www'));
});

// Bower
gulp.task('copy-bower', function () {
  return gulp.src(['./bower_components/**/*'], {base: './'})
    .pipe(gulp.dest('./www'));
});

// Fonts
gulp.task('copy-fonts', function () {
  return gulp.src(['./src/fonts/**/*'], {base: './src'})
    .pipe(gulp.dest('./www'));
});


// Jade/Pug to HTML
gulp.task('build-jade', function () {
  return gulp.src(src.jade, {base: './src/jade'})
    .pipe(plumber(plumberErrorHandler))
    .pipe(pug({pretty: true}))
    .pipe(gulp.dest('www'));
});


function string_src(filename, string) {
  var src = stream.Readable({ objectMode: true });
  src._read = function () {
    this.push(new Vinyl({ cwd: '', base: '', path: filename, contents: Buffer.from(string) }));
    this.push(null);
  };
  return src;
}

gulp.task('minimize', function (cb) {
  if (!argv.production) {
    return cb();
  }

  return gulp.src(['www/*.html', 'www/templates/*.html'], {base: 'www'})
    .pipe(useref())
    .pipe(gulpif('*.css', cleanCss()))
    .pipe(gulpif('*.js', ngAnnotate()))
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.html', htmlmin({collapseWhitespace: true, removeComments: true})))
    .pipe(gulp.dest('www'));
});

var l10nOpts = {
  elements: [],
  native: 'origin.tmp',
  base: 'en',
  enforce: argv.production ? 'strict' : 'warn'
};

gulp.task('load-locales', function () {
  return gulp.src('locales/*.json')
    .pipe(l10n.setLocales({
      native: l10nOpts.native,
      enforce: l10nOpts.enforce
    }));
});

gulp.task('extract-locales', function () {
  return gulp.src('www/**/*.html')
    .pipe(l10n.extract({
      elements: l10nOpts.elements,
      native: l10nOpts.native
    }))
    .pipe(gulp.dest('locales'));
});

gulp.task('localize', gulp.series('load-locales', function localize() {
  return gulp.src('www/{./,templates}/*.html')
    .pipe(l10n())
    .pipe(gulp.dest('www'));
}));

// Watch for changes
gulp.task('watch', function () {
  gulp.watch('./src/sass/**/*', gulp.series('build-styles'));
  gulp.watch('./src/images/**/*', gulp.series('copy-images', 'build-styles'));
  gulp.watch('./src/js/**/*', gulp.series('copy-scripts'));
  gulp.watch('./src/jade/**/*', gulp.series('build-jade', 'localize'));
  gulp.watch('./src/bower_components/**/*.js', gulp.series('copy-bower'));
  gulp.watch('./src/static/**/*', gulp.series('copy-statics'));
  gulp.watch('./src/fonts/**/*', gulp.series('copy-fonts'));
  gulp.watch('./locales/**/*', gulp.series('localize'));
});


gulp.task('server', function () {
  return nodemon({
    script: 'server',
    watch: ['server', '.env'],
  });
});

// Base tasks
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('copy-bower', 'copy-fonts', 'copy-images', 'copy-scripts', 'build-styles', 'build-jade'),
  'copy-statics',
  'minimize'
));

gulp.task('production', function (cb) {
  argv.production = true;
  return gulp.series('build')(cb);
});

gulp.task('default', gulp.series('build', gulp.parallel('server', 'watch')));

gulp.on('err', function (e) {
  process.exit(1);
});


// TESTS

gulp.task('test', function () {
  return gulp.src(['./tests/tests/*.js'])
    .pipe(protractor.protractor({
      configFile: './protractor.config.js',
      args: ['--baseUrl', 'http://localhost:8080']
    }))
    .on('error', function (e) {
      console.error(e);
    })
    .on('end', function () {
      process.exit();
    });
});

gulp.task('test:travis', function () {
  return gulp.src(['./tests/tests/*.js'])
    .pipe(protractor.protractor({
      configFile: './protractor.travis.js',
      args: ['--baseUrl', 'http://localhost:8080']
    }))
    .on('error', function (e) {
      console.error(e);
    })
    .on('end', function () {
      process.exit();
    });
});

gulp.task('selenium', webdriver_standalone);
