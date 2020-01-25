<?php

require './engine/helpers/helpers.php';
require './engine/router/response.php';
require './engine/connectors/connector.php';
require './engine/entities/entity.php';
require './engine/router/request.php';
require './engine/api/api.php';
require './engine/content/content.php';
require './engine/doc/doc.php';
require './engine/ui/ui.php';

session_start();

if (PHP_SAPI === 'cli') {
    require './engine/cli/cli.php';

    $cliOptions = [
        new CliOption('m', 'method', 1, "Set HTTP method. ", "GET"),
    ];
    /*TODO
        new CliOption('H', 'headers', 1, "Set HTTP headers. ", ""),
   -f  --file     set file input
   -i  --interactive interactive modo
   -v  --verbose  set verbose debuggin
   }*/

    $options = getCliOptions($cliOptions,$argc, $argv);
    if($options['help']){
        exit(0);
    }
    $headers = [];//TODO
    $requestUri = $argc > 1
        ? '/api'.$argv[1]
        : '';

    $uriQueryString = explode('?', $requestUri);
    $uri = array_get($uriQueryString, 0, '');
    $queryString = array_get($uriQueryString, 1, '');
    $method = array_get($options, 'method', 'GET');
    echo $method;
} else {
    $headers = getallheaders();
    $uri = substr(strtok($_SERVER["REQUEST_URI"], '?'), strlen(dirname($_SERVER['SCRIPT_NAME'])));
    $method = $_SERVER['REQUEST_METHOD'];
    $queryString = array_get($_SERVER, 'QUERY_STRING', '');
}

if (strpos($uri, '/api/') === 0 || $uri === '/api') {
    $request = new ApiRequest(
        $method,
        substr($uri, 4),
        $queryString,
        $headers,
        @file_get_contents('php://input')
    );
} elseif (strpos($uri, '/ui/') === 0 || $uri === '/ui') {
    $request = new UiRequest(
        $method,
        substr($uri, 4),
        $queryString,
        $headers,
        @file_get_contents('php://input')
    );
} elseif (strpos($uri, '/doc/') === 0 || $uri === '/doc') {
    $request = new DocRequest(
        $method,
        substr($uri, 1),
        $queryString,
        $headers,
        @file_get_contents('php://input')
    );
} else {
    $request = new ContentRequest(
        $method,
        $uri,
        $queryString,
        $headers,
        @file_get_contents('php://input')
    );
}

$response = $request->createResponse();
$response->echo();
