var path = require('path');
var del = require('del');
var series = require('stream-series');
var gulp = require('gulp');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var webserver = require('gulp-webserver');
var templateCache = require('gulp-angular-templatecache');
var minifyCss = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var uglify = require('gulp-uglify-es').default;
var stylus = require('gulp-stylus');
var KarmaServer = require('karma').Server;
var sass = require('gulp-sass');
sass.compiler = require('node-sass');
var autoprefixer = require('gulp-autoprefixer');
var runSequence = require('run-sequence');

var babel = require('gulp-babel');

var paths = {
    root: __dirname,
    src: path.join(__dirname, '/src'),
    dist: path.join(__dirname, '/dist')
};

gulp.task('webserver', function () {
    return gulp.src(paths.root)
        .pipe(webserver({
            host: 'localhost',
            port: 3000,
            fallback: 'index.html',
            livereload: true
        }));
});

gulp.task('clean', function () {
    del.sync(paths.dist);
});

gulp.task('compileStyles', function () {
    return gulp.src(path.join(paths.src, './scss/style.scss'))
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(concat('select.css'))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('prefixer', function () {
    return gulp.src(path.join(paths.dist, './select.css'))
        .pipe(autoprefixer({
            browsers: [
                'firefox >= 20',
                'chrome >= 35',
                'safari >= 7',
                'ios >= 7',
                'android >= 4',
                'opera >= 12.1',
                'ie >= 10'],
            cascade: false
        }))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('minifyStyles', function () {
    return gulp.src(path.join(paths.dist, './select.css'))
        .pipe(minifyCss())
        .pipe(rename('select.min.css'))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('compileScripts', function () {
    var templateStream = gulp.src(path.join(paths.src, 'template.html'))
        .pipe(minifyHtml())
        .pipe(templateCache({
            module: 'oi.select',
            root: 'src/'
        }));

    var scriptStream = gulp.src([
        path.join(paths.src, 'module.js'),
        path.join(paths.src, 'utils.js'),
        path.join(paths.src, 'services.js'),
        path.join(paths.src, 'directives.js'),
        path.join(paths.src, 'filters.js')
    ]).pipe(babel());

    scriptStream
        .pipe(concat('select.js'))
        .pipe(gulp.dest(paths.dist))
        .pipe(uglify())
        .pipe(rename('select.min.js'))
        .pipe(gulp.dest(paths.dist));

    series(scriptStream, templateStream)
        .pipe(concat('select-tpls.js'))
        .pipe(gulp.dest(paths.dist))
        .pipe(uglify())
        .pipe(rename('select-tpls.min.js'))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('watch', function () {
    var directiveAssets = [
        path.join(paths.src, '**/*.js'),
        path.join(paths.src, 'template.html')
    ];

    gulp.watch(path.join(paths.src, '**/*.scss'), ['compileStyles']);
    gulp.watch(directiveAssets, function () {
        var modulePath = gulp.src([
            path.join(paths.src, 'module.js'),
            path.join(paths.src, 'utils.js'),
            path.join(paths.src, 'services.js'),
            path.join(paths.src, 'directives.js'),
            path.join(paths.src, 'filters.js')
        ]).pipe(babel());

        var templateStream = gulp.src(path.join(paths.src, 'template.html'))
            .pipe(minifyHtml())
            .pipe(templateCache({
                module: 'oi.select',
                root: 'src/'
            }));
        series(modulePath, templateStream)
            .pipe(concat('select-tpls.js'))
            .pipe(gulp.dest(paths.dist));
    });
});

gulp.task('test', function (done) {
    new KarmaServer({
        configFile: path.join(paths.root, 'karma.conf.js')
    }, done).start();
});
gulp.task('build', function() {
    runSequence('clean', 'compileScripts', 'compileStyles','prefixer','minifyStyles');
});
gulp.task('default', ['webserver', 'watch']);

