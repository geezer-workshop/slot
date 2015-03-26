var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var wrapper = require('gulp-wrapper');

var watchify = require('watchify');
var buffer = require('vinyl-buffer');
var glob = require('flat-glob').sync;
var browserify = require('browserify');
var source = require('vinyl-source-stream');

var bundler = createBundler();

function createBundler() {
    var bundler = browserify({
        cache: {},
        packageCache: {},
        fullPaths: true,
        debug: !pot.release
    });

    if (!pot.release) {
        bundler = watchify(bundler);
    }

    // Файлы приложения
    var entries = glob([
        glob(['./plugins/*.js']),
        glob(['./modules/*/*.js']).filter(pot.isSameFolder),
        glob(['./components/*/*.js']).filter(pot.isSameFolder),
        glob(['./helpers/blocks/*/*.js']).filter(pot.isSameFolder)
    ]);

    // Встроенные в слот компоненты и плагины
    entries = entries.concat(
        pot.introspection.components(),
        pot.introspection.plugins()
    );

    // Добавляем всё в бандл
    entries.forEach(function(entry) {
        bundler.require(entry);
    });

    // Добавляем точку входа
    bundler.require('./client.js', {expose: 'app'});

    // Обеспечиваем работу инжектора в релизной сборке. Преобразование сделано
    // глобальным, так как в противном случае browserify последних версий обрабатывает
    // не все требуемые файлы.
    if (pot.release) {
        bundler.transform(pot.lib('injector').injectStream, {global: true});
    }

    return bundler;
}

function vendorStream() {
    return gulp.src('vendor/**/*.js')
        .pipe(concat('vendor.js'));
}

function configStream() {
    var paths = ['config/base.js'];

    if (pot.release) {
        paths.push('config/production.js');
    }

    var configWrap = {
        header: "(function(exports) {\n",
        footer: "\n})(typeof window == 'undefined' ? exports : window.config = {});"
    };

    return gulp.src(paths)
        .pipe(concat('config.js'))
        .pipe(wrapper(configWrap))
        .pipe(gulp.dest('build/private'));
}

function templateStream() {
    return pot.recipes.templates.compile()
        .pipe(concat('templates.js'));
}

function bundleStream() {
    return bundler.bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer());
}

gulp.task('js.vendor', function() {
    return vendorStream()
        .pipe(gulp.dest('build/public/assets'));
});

gulp.task('js.config', function() {
    return configStream()
        .pipe(gulp.dest('build/public/assets'));
});

gulp.task('js.templates', function() {
    return templateStream()
        .pipe(gulp.dest('build/public/assets'));
});

gulp.task('js.bundle', function() {
    return bundleStream()
        .pipe(gulp.dest('build/public/assets'));
});

gulp.task('js.release', function() {
    var allJs = pot.esconcat(
        vendorStream(),
        configStream(),
        templateStream(),
        bundleStream()
    );

    return allJs
        .pipe(concat('app.js'))
        .pipe(uglify())
        .pipe(gulp.dest('build/public/assets'));
});

var jsTasks = [];
if (!pot.release) {
    jsTasks = [
        'js.config',
        'js.vendor',
        'js.bundle',
        'js.templates'
    ];
} else {
    jsTasks = ['js.release'];
}
gulp.task('js', jsTasks);

exports.bundler = bundler;
