## Code

The code is separated into four distinct parts:

- data: The raw data.

- custom: All custom entity, content and type definitions.

- engine: The code for the server side engine

- factory: The source and generating code used to compile the client side engine


```
   Data <-> Connector <-> Server Engine <-> REST API <-> Client Engine <-> UI
json,xml,    php              php            http            js          html,css
csv,..
```