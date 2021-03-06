const gulp = require('gulp');

const {build, pack, generateTypesFile, generateDisplaysFile, generateCssFile, generateDocs, watchGulp} = require('./gulp/methods.js');
// a
watchGulp(['./gulp/**/*.js', './gulpfile.js']);

gulp.watch(['../../factory/css/**/*.css'], gulp.series(generateCssFile, pack));
gulp.watch(['../../engine/core/*/*/*.css'], gulp.series(generateCssFile, pack));

gulp.watch(['../../custom/*/types/*/*.css'], gulp.series(generateCssFile, pack));
gulp.watch(['../../custom/*/displays/*/*.css'], gulp.series(generateCssFile, pack));

gulp.watch(['../../engine/core/types/**/*.js'], gulp.series(generateTypesFile, pack));
gulp.watch(['../../custom/*/types/**/*.js'], gulp.series(generateTypesFile, pack));

gulp.watch(['../../engine/core/displays/**/*.js'], gulp.series(generateDisplaysFile, pack));
gulp.watch(['../../custom/*/displays/**/*.js'], gulp.series(generateDisplaysFile, pack));

gulp.watch([
  './source/render/display.js',
  '../../engine/connectors/connector.php',
  '../../engine/core/displays/item/item.js',
  '../../engine/core/types/type/type.js',
  '../../engine/core/types/type/type.php',
  './source/render/item.js',
  './source/main.js'
], generateDocs);

gulp.watch(['./source/**/*.js'], pack);

exports.default = build;
