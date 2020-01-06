<?php

require './lib/helpers/helpers.php';
require './lib/router/response.php';
require './lib/storage/storage.php';
require './lib/entities/entity.php';
require './lib/ui/ui.php';
require './lib/router/request.php';

$uri = substr(strtok($_SERVER["REQUEST_URI"],'?'), strlen(dirname($_SERVER['SCRIPT_NAME'])));

if (strpos($uri, '/api/') === 0) {
    $request = new ApiRequest(
        $_SERVER['REQUEST_METHOD'],
        substr($uri, 4),
        array_get($_SERVER, 'QUERY_STRING', ''),
        getallheaders(),
        @file_get_contents('php://input')
    );
} elseif (strpos($uri, '/ui/') === 0) {
    $request = new UiRequest(
        $_SERVER['REQUEST_METHOD'],
        substr($uri, 4),
        array_get($_SERVER, 'QUERY_STRING', ''),
        getallheaders(),
        @file_get_contents('php://input')
    );
} else {
    $request = new ContentRequest(
        $_SERVER['REQUEST_METHOD'],
        $uri,
        array_get($_SERVER, 'QUERY_STRING', ''),
        getallheaders(),
        @file_get_contents('php://input')
    );
}

$response = $request->createResponse();
$response->echo();
