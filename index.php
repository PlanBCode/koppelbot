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
        new CliOption('v', 'verbose', 0, "Set verbose output. ", false),
        new CliOption('S', 'server', 1, "Run local server. ", 'localhost:8000'),
        new CliOption('p', 'prefix', 1, "Set uri prefix ", '/api')
    ];

    /*TODO
        new CliOption('H', 'headers', 1, "Set HTTP headers. ", ""),
   -f  --file     set file input
   -i  --interactive interactive mode
   -v  --verbose  set verbose debugging
   }*/

    $options = getCliOptions($cliOptions, $argc, $argv);
    if ($options['help']) {
        exit(0);
    }
    $headers = [];//TODO from cliOptions

    $requestUri = count($options['args']) > 1
        ? $options['prefix'] . $options['args'][1]
        : ''; //TODO fallback

    $content = array_get($options['args'], 2, '');
    $uriQueryString = explode('?', $requestUri);
    $uri = array_get($uriQueryString, 0, '');
    $queryString = array_get($uriQueryString, 1, '');
    $method = array_get($options, 'method', 'GET');
    if (array_get($options, 'verbose', false)) {
        echo ' - method      : ' . $method . PHP_EOL;
        echo ' - uri         : ' . $uri . PHP_EOL;
        echo ' - queryString : ' . $queryString . PHP_EOL;
        echo ' - content     : ' . json_encode($content) . PHP_EOL;
    }
    if ($uri === '') {
        showHelp($cliOptions);
        exit(0);
    }
} else if (php_sapi_name() === 'cli-server') {
    $headers = getallheaders();
    $uri = strtok($_SERVER["REQUEST_URI"], '?');
    $method = $_SERVER['REQUEST_METHOD'];
    $queryString = array_get($_SERVER, 'QUERY_STRING', '');
    $content = @file_get_contents('php://input');
} else {
    $headers = getallheaders();
    $uri = substr(strtok($_SERVER["REQUEST_URI"], '?'), strlen(dirname($_SERVER['SCRIPT_NAME'])));
    $method = $_SERVER['REQUEST_METHOD'];
    $queryString = array_get($_SERVER, 'QUERY_STRING', '');
    $content = @file_get_contents('php://input');
}

if (strpos($uri, '/api/') === 0 || $uri === '/api') {
    $request = new ApiRequest(
        $method,
        substr($uri, 4),
        $queryString,
        $headers,
        $content
    );
} elseif (strpos($uri, '/ui/') === 0 || $uri === '/ui') {
    $request = new UiRequest(
        $method,
        substr($uri, 4),
        $queryString,
        $headers,
        $content
    );
} elseif (strpos($uri, '/doc/') === 0 || $uri === '/doc') {
    $request = new DocRequest(
        $method,
        substr($uri, 1),
        $queryString,
        $headers,
        $content
    );
} else {
    $request = new ContentRequest(
        $method,
        $uri,
        $queryString,
        $headers,
        $content
    );
}

$response = $request->createResponse();
$status = $response->echo();

if (PHP_SAPI === 'cli' && $status !== 200) {
    exit($status); // Nb: exit code is 0-255 so 404 becomes 404%256 = 148
}