# koppelbot

Koppelbot is a server side application that provides API and UI interfaces to your data.

Using data models and html templates you can quickly build your web based applications.

## API

The API provides a json interface to the data. 

The uri's for API endpoints are structured as:

`http(s)://$HOST:$PORT/api/$ENTITY_CLASS/$ENTITY_ID/$PROPERTY_NAME/...`

Examples

`http://localhost:8080/api/car?color=red`
Get all red cars.

`https://www.site.com/api/fruit/apple/color`
Get the color of the fruit apple.

`https://www.site.com/api/fruit/*/color`
Get the colors of all fruits.

`http://localhost:8080/api/car/*/color,model`
Get the color and model for all cars.

`https://www.site.com/api/fruit/banana,grape/color`
Get the colors of the banana and grape fruit.

More API documentation can be found at `http(s)://$HOST:$PORT/doc/api`

## UI

The User Interface (UI) provides a html+js user interface to the data. 

The uri's for UI endpoints are structured as:

`http(s)://$HOST:$PORT/api/$DISPLAY_NAME/$ENTITY_CLASS/$ENTITY_ID/$PROPERTY_NAME/...`

Examples:

`http://localhost:8080/ui/list/car?color==red`
Get a list overview for all red cars.

`http://localhost:8080/ui/create/fruit`
Get an interface to create a new fruit.

More UI documentation can be found at `http(s)://$HOST:$PORT/doc/ui`

## Documentation

Documentation can be found at:

`http(s)://$HOST:$PORT/doc`

## Code

The code is separated into three distinct parts:

- data: The raw data.

- custom: All custom entity, content and type definitions. 

- engine: The code for the server and client side engines.</dd>



```
   Data <-> Connector <-> Server Engine <-> REST API <-> Client Engine <-> UI
json,xml,    php              php            http            js          html,css
csv,..
```