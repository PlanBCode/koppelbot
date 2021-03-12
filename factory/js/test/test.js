const curl = require('./curl').curl;
const browse = require('./browse').browse;

curl('DELETE', '/fruit/apple')
  .statusShouldMatch(200)
  .contentShouldMatch({
    color: null,
    size: null,
    name: null
  })
  .runSync('Fruit DELETE');

curl('PUT', '/fruit/apple', '{"color":"red","name":"apple","size":"medium"}')
  .statusShouldMatch(200)
  .contentShouldMatch({
    color: null,
    size: null,
    name: 'apple'
  })
  .runSync('Fruit PUT');

curl('HEAD', '/fruit/apple')
  .statusShouldMatch(200)
  .contentShouldMatch('')
  .runSync('Fruit HEAD');

curl('HEAD', '/fruit/cucumber')
  .shouldFail(200)
  .contentShouldMatch('')
  .runSync('Fruit HEAD fail');

curl('GET', '/fruit/banana')
  .statusShouldMatch(404)
  .run('Fruit: GET 404');

curl('GET', '/fruit/apple')
  .statusShouldMatch(200)
  .contentShouldMatch({
    color: 'red',
    size: 'medium',
    name: 'apple'
  })
  .run('Fruit GET');

curl('GET', '/fruit/apple?expand')
  .statusShouldMatch(200)
  .contentShouldMatch('apple', ['fruit', 'apple', 'name'])
  .contentShouldMatch({
    fruit: {
      apple: {
        color: 'red',
        size: 'medium',
        name: 'apple'
      }
    }
  })
  .run('Fruit GET ?expand');

curl('GET', '/fruit/*/color')
  .statusShouldMatch(200)
  .contentShouldMatch({
    grape: 'purple',
    melon: 'green',
    apple: 'red',
    orange: 'orange'
  })
  .run('Fruit: get color');

curl('GET', '/drink/wine/ingredient/size')
  .statusShouldMatch(200)
  .contentShouldMatch('small')
  .run('Drink: get ingredient size');

curl('GET', '/drink/wine/ingredient.size,name')
  .statusShouldMatch(200)
  .contentShouldMatch({
    ingredient: 'small',
    name: 'wine'
  })
  .run('Drink: get name and ingredient size');

curl('GET', '/fruit/*?color==green')
  .statusShouldMatch(200)
  .contentShouldMatch({
    melon: {
      color: 'green',
      size: 'small',
      name: 'melon'
    }
  })
  .run('Fruit: filter on color==green');

curl('GET', '/fruit/*/name')
  .statusShouldMatch(200)
  .contentShouldMatch({
    grape: 'grape',
    melon: 'melon',
    apple: 'apple',
    orange: 'orange'
  })
  .run('Fruit: No sorting');

curl('GET', '/fruit/*/name?sortBy=color')
  .statusShouldMatch(200)
  .contentShouldMatch({
    grape: 'grape',
    melon: 'melon',
    orange: 'orange',
    apple: 'apple'
  })
  .run('Fruit: Sorting');

curl('GET', '/fruit/*/name?sortBy=color&offset=1&limit=2')
  .contentShouldMatch({
    orange: 'orange',
    grape: 'grape'
  })
  .run('Fruit: Limit and offset');

curl('GET', '/fruit/*/name?search=range')
  .contentShouldMatch({
    orange: 'orange'
  })
  .run('Fruit: Search');

curl('GET', '/fruit/*/name?search=non_existing_string')
  .contentShouldMatch([])
  .run('Fruit: Search without result');

curl('PATCH', '/fruit/melon/size', 'small')
  .contentShouldMatch(null)
  .runSync('Fruit: Patch melon');

curl('PATCH', '/fruit/melon/size?expand', '{"fruit":{"melon":{"size":"small"}}}')
  .contentShouldMatch({fruit: {melon: {size: null}}})
  .runSync('Fruit: Patch melon ?expand');

curl('PATCH', '/fruit/melon/size?expand', '{brokenJson')
  .shouldFail()
  .contentShouldMatch('Could not parse JSON: Syntax error.')
  .run('Fruit: Patch melon ?expand broken JSON');

curl('PUT', '/session/member ', '{"login":{"username":"member","password":"member"}}')
  .statusShouldMatch(200)
  .contentShouldMatch({login: null})
  .run('Session: Member login');

curl('PUT', '/session/member ', '{"login":{"username":"member","password":"wrongpassword"}}')
  .shouldFail()
  .contentShouldMatch({
    login: 'Incorrect user-password combination.',
    groups: 'Forbidden'
  })
  .run('Session: Member login faulty password');

/* browse('sample.html')
    .run('Test browse');
*/

exports.curl = curl;
exports.file = require('./file');
exports.browse = require('./browse');
