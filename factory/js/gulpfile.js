const gulp = require('gulp');

const {build, pack, generateTypesFile, generateDisplaysFile, generateCssFile, generateJsDocs} = require('./gulp/methods.js');

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
  '../../engine/core/types/type/type.js',
  '../../engine/core/types/type/type.php',
  './source/render/item.js'
], generateJsDocs);

gulp.watch(['./source/**/*.js'], pack);

exports.default = build;
