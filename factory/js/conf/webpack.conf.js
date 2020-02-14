const path = require('path');

module.exports = {
    entry: './source/main.js',
    output: {
        path: path.resolve(__dirname, '.'),
        filename: '../../../engine/ui/xyz-ui.webpacked.js',
        library: 'xyz' // added to create a library file
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/
            }
        ]
    }
};
