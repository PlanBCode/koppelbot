# XYZ - Tutorial


## Installation

1. Download the source from github

    https://github.com/PlanBCode/koppelbot/archive/master.zip

  or clone using git

    ```
    $ git clone https://github.com/PlanBCode/koppelbot.git
    ```

2. Open your terminal and go to the directory. If you run a `ls` list command you should see the following content

```
$ ls
README.md	data		factory		tutorial.txt
custom		engine		index.php	xyz
```

-  `custom` : the place to store custom data model definitions and other plugins

-  `data` : in this folder all data is stored.
-  `engine` : the server code that uses the custom definitions to build the interfaces.
-  `factory` : code used to generate the server code. Only required for developers, out of scope for this tutorial.

-  `index.php` : the main entry point for the server

-  `xyz` : the command to interact with your server from the command line.

## First commands

3.  Run your first server command. If you enter `./xyz` the help information will be shown:

```
$ ./xyz
Usage: xyz [options] uri [content]
   xyz "/fruit/apple"
   xyz "/fruit/*/color"
   xyz "/fruit/*?color==green"
   xyz --method PATCH "/fruit/melon/size" large

  -m  --method <arg>      Set HTTP method. (Default = GET)
  -V  --verbose           Set verbose output. (Default = false)
  -S  --server <arg>      Run local server. (Default = localhost:8000)
```

4. Try the first suggestion:  (note the `./` at the start)

```
$ ./xyz "/fruit/apple"
{
    "color": "red",
    "size": "medium",
    "name": "apple"
}
```

 This will give the data for apple

5. Try the second suggestion

```
$ ./xyz "/fruit/*/color"
{    
    "grape": "green",
    "melon": "green",
    "apple": "red",
    "orange": "orange"   
}
```

 This will give the color property for all fruits

6. Try the third suggestion (Note the double `=` sign)

```
$ ./xyz "/fruit/*?color==green"
{
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
}
```

This will give all the data for the fruits which have a green color

7. The size for melon is small. That doesn't seem right. Let's fix that using the fourth suggestion

```
$ ./xyz --method PATCH "/fruit/melon/size" large
```

And let's check if it's correct now:

```
$ ./xyz "/fruit/melon"
{
    "color": "green",
    "size": "large",
    "name": "melon"            
}
```

That's looks better.

## Running a local server

7. Now we want to use the server through the browser. To start your server locally run `./xyz -S`.
This will start a local test server. It will act like the regular server but without the need for Apache software and
it won't be available through the internet for other users.

 ```
   $ ./xyz -S
   Starting server on localhost:8000
   PHP 7.3.11 Development Server started at Mon Feb 17 11:10:20 2020
   Listening on http://localhost:8000
   Document root is /your/local/server/path/
   Press Ctrl-C to quit.
   ```
If you close the terminal or press Control + C the server will be stopped.

8. Browse to the following - probably familiar looking - places:

- http://localhost:8000/api/fruit/apple
- http://localhost:8000/api/fruit/*/color
- http://localhost:8000/api/fruit/*?color==green

## Templates

9. With your a text editor open the file `./custom/tutorial/content/index.html`
(or run `cat ./custom/tutorial/content/index.html` in your terminal to view it.)

```
<html>
<head>
    <script type="text/javascript" src="./xyz-ui.js"></script>
    <link rel="stylesheet" type="text/css" href="./xyz-style.css"/>
    <title>xyz - tutorial</title>
</head>
<body style="padding: 1cm 3cm 3cm 3cm">
    <h1>xyz - Tutorial</h1>

    <h3>List of fruits</h3>

    <xyz uri="/fruit/*/name" display="list" select="myFruit"/>

    <h3>Selected fruit</h3>

    <xyz uri="$myFruit" display="item"/>

</body>
</html>
```

```
    <script type="text/javascript" src="./xyz-ui.js"></script>
```

Includes the `xyz-ui.js` script. A JavaScript file that handles the client side rendering of the data.

```
    <link rel="stylesheet" type="text/css" href="./xyz-style.css"/>
```

Includes the `xyz-style.css` style sheet. A CSS file that handles the  styling of the components.

```
    <xyz uri="/fruit/*/name" display="list" select="myFruit"/>
```

This retrieves all fruit names and displays them in a list. If you select one. That selection will be stored in the
`myFruit` variable.


```
    <xyz uri="$myFruit" display="item"/>
```

When the `myFruit` variable is not empty this will retrieve the specified fruit and display it.

10. Now browse to http://localhost:8000/tutorial

11. Press the `+` Button below the list to unfold the creation interface. Try to add a fruit.

12. Open the `./custom/tutorial/content/index.html` file in your text editor and change the

```
    <xyz uri="$myFruit" display="item"/>
```

Into:

```
    <xyz uri="$myFruit" display="edit"/>
```

This will display an editor instead of an item viewer. Browse to http://localhost:8000/tutorial again to edit
the selected piece of fruit.

13. Now view `./custom/main/entities/fruit.json` in your text editor.
(or run `cat ./custom/main/entities/fruit.json` in your terminal to view it.)

```
{
  "_": {
    "connector": {
      "type": "file",
      "parse": "json",
      "path": "data/fruits.json"
    }
  },
  "color": {
    "type": "string",
    "default" : "green"
  },
  "size": {
    "type": "enum",
    "choices" : ["small","medium","large"]
  },
  "name": {
    "type": "string",
    "required": true,
    "connector": {
      "key": "key"
    }
  }
}
```

This file shows the property definitions for the fruit entity.

```
  "_": {
```

Root properties, indicated by the underscore, are used for all properties.

```
 "connector": {
      "type": "file",
      "parse": "json",
      "path": "data/fruits.json"
    }
```

The connector settings define the way the data is stored.

```
"color": {
    "type": "string",
    "default" : "green"
  },
```

color is a string that defaults to green.

```
"size": {
    "type": "enum",
    "choices" : ["small","medium","large"]
  },
```

The size of a fruit is one of the choices in the list small, medium or large.

```
  "name": {
    "type": "string",
    "required": true,
    "connector": {
      "key": "key"
    }
  }
```

The name is used as the key by the connector.

14. Now view `./data/fruits.json` in your text editor.
(or run `cat ./data/fruits.json` in your terminal to view it.)

```
{"grape":{"color":"green","size":"small"},"melon":{"color":"green","size":"large"},"apple":{"color":"red","size":"medium"},"orange":{"color":"orange","size":"medium"}}
```

This is the raw data for the fruit entities.
