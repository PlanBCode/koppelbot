const curl = require('./curl').curl;

curl('GET', '/source/fruif')
    .statusShouldMatch(404)
    .run();

curl('GET', '/source/fruit/file/content')
    .statusShouldMatch(200)
    .contentShouldMatch({"source":{"fruit":{"file":{"content":"appel"}}}})
    .run();

curl('GET', '/source/fruit')
    .statusShouldMatch(200)
    .contentShouldMatch('appel',['source','fruit','file','content'])
    .run();

exports.curl = curl;
exports.file = require('./file');
exports.browse = require('./browse');