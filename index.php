<?

require('./lib/router/response.php');
require('./lib/storage/storage.php');
require('./lib/entities/entity.php');
require('./lib/router/request.php');

$uri =    $_SERVER['REQUEST_URI'];
if (strpos($uri, '/api/') === 0) {
    $request = new ApiRequest(
        $_SERVER['REQUEST_METHOD'],
        substr($uri,4),
        $_SERVER['QUERY_STRING'],
        getallheaders(),
        @file_get_contents('php://input')
    );
}else{
    $request = new ContentRequest(
        $_SERVER['REQUEST_METHOD'],
        $uri,
        $_SERVER['QUERY_STRING'],
        getallheaders(),
        @file_get_contents('php://input')
    );

}

$response = $request->createResponse();

$response->echo();




?>