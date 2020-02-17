# XYZ - Tutorial

1. Download the source from github

    https://github.com/PlanBCode/koppelbot/archive/master.zip

  or clone using git

    `$ git clone https://github.com/PlanBCode/koppelbot.git`

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

3.  Run your first server command. If you enter `./xyz` the help information will be shown:

```
$ ./xyz
Usage: xyz [options] uri [content]
   xyz "/fruit/apple"
   xyz "/fruit/*/color"
   xyz "/fruit/*?color==green"
   xyz --method PATCH "/fruit/melon/size" large

  -m  --method <arg>      Set HTTP method. (Default = GET)
  -v  --verbose           Set verbose output. (Default = false)
  -S  --server <arg>      Run local server. (Default = localhost:8000)
```

4. Try the first suggestion:  (note the `./` at the start)

```
$ ./xyz "/fruit/apple"
TODO
```

 This will give the data for apple

5. Try the second suggestion

```
$ ./xyz "/fruit/*/color"
TODO
```

 This will give the color property for all fruits

6. Try the third suggestion (Note the double `=` sign)

```
$ ./xyz "/fruit/*?color==green"
TODO
```

This will give all the data for the fruits which have a green color

7. The size for melon is small. That doesn't seem right. Let's fix that using the fourth suggestion

```
$ ./xyz --method PATCH "/fruit/melon/size" large
TODO
```

And let's check if it's correct now:

```
$ ./xyz -"/fruit/melon"
TODO
```

That's looks better.

7. Now we want to use the server through the browser. To start your server locally run `./xyz -S`.
This will start a local test server. It will act like the regular server but without the need for Apache software and
it won't be available through the internet for other users.

 ```
   $ ./xyz -S
   PHP 7.3.11 Development Server started at Mon Feb 17 11:10:20 2020
   Listening on http://localhost:8000
   Document root is /your/local/server/path/
   Press Ctrl-C to quit.
   ```
If you close terminal or press Control + C the server will be stopped.

8. Browse to the following - probably familiar looking - places:

http://localhost:8000/fruit/apple
http://localhost:8000/fruit/*/color
http://localhost:8000/fruit/*?color==green

9. With your a text editor open the file `./custom/main/content/tutorial.html`
(or run `cat ./custom/main/content/tutorial.html` in your terminal to view it.)

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

10. Now browse to http://localhost:8000/tutorial.html






