<?php

require './engine/helpers/helpers.php';
require './engine/router/response.php';
require './engine/core/connectors/storage.php';
require './engine/entities/entity.php';
require './engine/ui/ui.php';
require './engine/router/request.php';

$uri = substr(strtok($_SERVER["REQUEST_URI"],'?'), strlen(dirname($_SERVER['SCRIPT_NAME'])));

if (strpos($uri, '/api/') === 0 || $uri === '/api') {
    $request = new ApiRequest(
        $_SERVER['REQUEST_METHOD'],
        substr($uri, 4),
        array_get($_SERVER, 'QUERY_STRING', ''),
        getallheaders(),
        @file_get_contents('php://input')
    );
} elseif (strpos($uri, '/ui/') === 0 || $uri === '/ui') {
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
