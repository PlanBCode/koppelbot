# XYZ Developer documentation


## File Structure

The code is separated into four distinct parts:

- data: The raw data.

- custom: All custom entity, content and type definitions.

- engine: The code for the server side engine

- factory: The source and generating code used to compile the client side engine


## Plugins (WIP)

The code will be structered in plugins (directories). Currenlty there are only two
(hardcoded) plugins:

`custom/main` : containing all work in progress, tests, tutorials and entities

`engine/core` : containing all elements required out of the box.

A plugin can contain the following components:

`content` : Served directly such as html, css, images
`entities` : the data models
`connectors` : defining the storage interfaces for entity data.
`displays` : defining the user interfaces to display and manage
entities (lists, timelines)
`types` : the data types for the entity properties. (strings, numbers,
arrays)
[Future] `flows` : (automated) actions on entities. (on create entity
send mail)

## Entity

TODO


## Data flow

```
   Data <-> Connector <-> Server Engine <-> REST API <-> Client Engine <-> UI
json,xml,    php              php            http            js          html,css
csv,..
```

## Back end

TODO

## Front end

TODO

## Dev tools/setup


## Testing

TODO



## Glossary

TODO
