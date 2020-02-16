const curl = require('./curl').curl;


curl('GET', '/source/fruif')
    .statusShouldMatch(404)
    .run();


exports.curl = curl;
exports.file = require('./file');
exports.browse = require('./browse');
