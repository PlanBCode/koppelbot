# XYZ

XYZ is a server side application that provides API and UI interfaces to your data.

Using data models and html templates you can quickly build your web based applications.

## Getting started

For a full introduction check tutorial.md

### Web server
To install for Apache web server: copy the repo to the server folder. the `.htaccess` file
will rout all requests to index.php;  

### Local test server

A local (php) test server can be started using:

`$ ./xyz start`


## API

The API provides a json interface to the data.

The uri's for API endpoints are structured as:

`http(s)://$HOST:$PORT/api/$ENTITY_CLASS/$ENTITY_ID/$PROPERTY_NAME/...`

Examples

`http://localhost:8000/api/car?color==red`
Get all red cars.

`https://www.site.com/api/fruit/apple/color`
Get the color of the fruit apple.

`https://www.site.com/api/fruit/*/color`
Get the colors of all fruits.

`http://localhost:8000/api/car/*/color,model`
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
