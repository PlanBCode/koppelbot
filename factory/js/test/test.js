const curl = require('./curl').curl;

curl('GET', '/fruit/banana')
    .statusShouldMatch(404)
    .run();

curl('GET', '/fruit/apple')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "color": "red",
        "size": "medium",
        "name": "apple"
    })
    .run();

curl('GET', '/fruit/apple?expand')
    .statusShouldMatch(200)
    .contentShouldMatch('apple',['fruit','apple','name'])
    .contentShouldMatch({
        "fruit": {
            "apple": {
                "color": "red",
                "size": "medium",
                "name": "apple"
            }
        }
    })
    .run();

curl('GET', '/fruit/*/color')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "grape": "green",
        "melon": "green",
        "apple": "red",
        "orange": "orange"
    })
    .run();

curl('GET', '/fruit/*?color==green')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "grape": {
            "color": "green",
            "size": "small",
            "name": "grape"
        },
        "melon": {
            "color": "green",
            "size": "small",
            "name": "melon"
        }
    })
    .run();

exports.curl = curl;
exports.file = require('./file');
exports.browse = require('./browse');