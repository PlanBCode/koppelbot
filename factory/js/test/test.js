const curl = require('./curl').curl;

curl('GET', '/fruit/banana')
    .statusShouldMatch(404)
    .run('Fruit: GET 404');

curl('GET', '/fruit/apple')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "color": "red",
        "size": "medium",
        "name": "apple"
    })
    .run('Fruit GET');

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
    .run('Fruit GET ?expand');

curl('GET', '/fruit/*/color')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "grape": "green",
        "melon": "green",
        "apple": "red",
        "orange": "orange"
    })
    .run('Fruit : get color');

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
    .run('Fruit: filter on color=green');

curl('GET', '/fruit/*/name')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "grape": "grape",
        "melon": "melon",
        "apple": "apple",
        "orange": "orange"
    })
    .run('Fruit: No sorting');

curl('GET', '/fruit/*/name?sortBy=color')
    .statusShouldMatch(200)
    .contentShouldMatch({
        "grape": "grape",
        "melon": "melon",
        "orange": "orange",
        "apple": "apple"
    })
    .run('Fruit: Sorting');

curl('GET', '/fruit/*/name?sortBy=color&offset=1&limit=2')
    .contentShouldMatch({
        "melon": "melon",
        "orange": "orange"
    })
    .run('Fruit: Limit and offset');

curl('PATCH', '/fruit/melon/size','small')
    .contentShouldMatch(null)
    .run('Fruit: Patch melon');

curl('PATCH', '/fruit/melon/size?expand','{"fruit":{"melon":{"size":"small"}}}')
    .contentShouldMatch({fruit:{melon:{size:null}}})
    .run('Fruit: Patch melon ?expand');

curl('PATCH', '/fruit/melon/size?expand','{brokenJson')
    .shouldFail()
    .contentShouldMatch('Could not parse JSON: Syntax error.')
    .run('Fruit: Patch melon ?expand broken JSON');

exports.curl = curl;
exports.file = require('./file');
exports.browse = require('./browse');