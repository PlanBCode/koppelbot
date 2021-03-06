# XYZ Developer documentation


## File Structure

The code is separated into four distinct parts:

- `custom/` : All custom entity, content and type definitions.

- `data/` : The raw data.

- `engine/` : The code for the server side engine.

- `factory/`: The source and generating code used to compile the client side engine.


## Plugins

Custom code is structured using plugins (directories)

`custom/*` : containing definitions and sub endpoints.
For example: `https://$hostname/tutorial` will serve `custom/tutorial/content/index.html`

Where `custom/main` contains main definitions and the root endpoint.
For example: `https://$hostname` will serve `custom/main/content/index.html`

`engine/core` : containing all elements available out of the box.

A plugin can contain the following components:

`content/` : Served directly such as html, css, images
`entities/` : the data models
`connectors/` : defining the storage interfaces for entity data.
`displays/` : defining the user interfaces to display and manage
entities (lists, timelines)
`types/` : the data types for the entity properties. (strings, numbers,
arrays)
[Future] `flows/` : (automated) actions on entities. (on create entity
send mail)

## Entities

An entity class is an abstract definition of an entity. It is
identified by an EntityClassName (`fruit`) and defined by a json
file (`entities/fruit.json`).

An instance of an EntityClass, an Entity, is identified by an EntityId
`apple`. The data is stored based on the connector settings for the
EntityClass and can be queried using `/$EntityClassName/$EntityId`
(`/fruit/apple`) or `/$EntityClassName/*` to get all instances.

The EntityClass definition is a json file that contains specifications for

- properties : which type, which defaults,
- connectors : how to store the data (per property)
- access : who has what kind of access to this entity (or property)

## Data flow

```
   Data <-> Connector <-> Server Engine <-> REST API <-> Client Engine <-> UI
json,xml,    php              php            http            js          html,css
csv,..
```

## Back end

The main backend php code is located in `engine/`. Note that the type
and connector plugin folders also contain php scripts which could be
located in `custom/`.

The entry point for any request is `index.php`

- `/api` requests : entity data in json format
- `/doc` requests : auto generated documentation
- content requests : serve web content

An api requests consists of a path and a querystring:

`/$EntityClassNames/$EntityIds/$PropertyNames...?$QueryStatements`

First the querystring is used to create a request for data to do any
requested filtering. This will be another api request (without
querystring).

First the request is grouped into connector requests. This ensures
that a file is only opened once and not multiple times for different
entities or properties.

These are then grouped in to responses based on the
EntityClass:Entity:Property:SubProperty:... hierarchy.

## Front end

The front end javascript code is located in `/factory/js/source` with
dependencies in `/factory/node_modules/` and plugin code for the types
and displays.
This code is packed using a *gulp* script which collects all custom
components and *webpack* to generate a single file
`/engine/ui/xyz-ui.webpacked.js` which is served as `/engine/ui/xyz-ui.js`

## Testing

TODO



## Glossary

TODO
