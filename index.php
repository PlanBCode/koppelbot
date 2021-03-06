<?php
ini_set('memory_limit', '256M'); // increase memory limit for large queries

http_response_code(500); // Default to error because if php crashes it will return a 200 if display_errors is on

$GLOBALS['constants'] = json_decode(file_get_contents('./engine/const/constants.json'), true);

require './engine/helpers/helpers.php';
require './engine/router/response.php';
require './engine/connectors/connector.php';
require './engine/entities/entity.php';
require './engine/router/request.php';
require './engine/api/api.php';
require './engine/content/content.php';
require './engine/doc/doc.php';

session_start();

$isCli = PHP_SAPI === 'cli';

if ($isCli) {
    $VERSION = '0.1.0'; //TODO make an api endpoint for this.
    require './engine/cli/cli.php';

    $cliOptions = [
        new CliOption('m', 'method', 1, "Set HTTP method. ", "GET"),
        new CliOption('V', 'verbose', 0, "Set verbose output. ", false),
        new CliOption('v', 'version', 0, "Get version. ", false),
        new CliOption('S', 'server', 1, "Run local server. ", 'localhost:8000'),
        new CliOption('p', 'prefix', 1, "Set uri prefix ", '/api')
    ];

    /*TODO
        new CliOption('H', 'headers', 1, "Set HTTP headers. ", ""),
   -f  --file     set file input
     - input/output
   -i  --interactive interactive mode
   }*/

    $options = getCliOptions($cliOptions, $argc, $argv);
    if (array_get($options,'help',false)) exit(0);

    $headers = [];//TODO from cliOptions
    $requestUri = createCliRequestUri($options);

    //Note: php does not parse 'a b' into a single argument ['a b'], instead it passed ['a','b']
    $content = implode(' ', array_slice($options['args'], 2));
    $uriQueryString = explode('?', $requestUri);
    $uri = array_get($uriQueryString, 0, '');
    $queryString = implode('?',array_slice($uriQueryString, 1));
    $method = array_get($options, 'method', 'GET');
    if (array_get($options, 'verbose', false)) {
        echo 'Request:' . PHP_EOL;
        echo ' - method      : ' . $method . PHP_EOL;
        echo ' - uri         : ' . $uri . PHP_EOL;
        echo ' - queryString : ' . $queryString . PHP_EOL;
        echo ' - content     : ' . json_encode($content) . PHP_EOL;
        echo ' - version     : ' . $VERSION . PHP_EOL;
        //TODO headers
    }
    if ($uri === '') {
        showHelp($cliOptions);
        exit(0);
    } else if (array_get($options, 'version', false)) {
      echo 'v'.$VERSION.PHP_EOL;
      exit(0);
    }
} else if (php_sapi_name() === 'cli-server') {
    $headers = getallheaders();
    $uri = strtok($_SERVER["REQUEST_URI"], '?');
    $method = $_SERVER['REQUEST_METHOD'];
    $queryString = rawurldecode(array_get($_SERVER, 'QUERY_STRING', ''));
    $content = @file_get_contents('php://input');
} else {
    $headers = getallheaders();
    $uri = substr(strtok($_SERVER["REQUEST_URI"], '?'), strlen(dirname($_SERVER['SCRIPT_NAME'])));
    if(substr($uri,0,1)!=='/') $uri = '/'.$uri;
    $method = $_SERVER['REQUEST_METHOD'];
    $queryString = rawurldecode(array_get($_SERVER, 'QUERY_STRING', ''));
    $content = @file_get_contents('php://input');
}

if (strpos($uri, '/api/') === 0 || $uri === '/api') {
    $accessGroups = $GLOBALS['constants']['defaultGroups'];

    function isLocalhost($whitelist = ['127.0.0.1', '::1']) {
        return in_array($_SERVER['REMOTE_ADDR'], $whitelist);
    }

    if($isCli || isLocalhost())  $accessGroups[] = 'local';

    if (array_key_exists('content', $_SESSION)) {
        foreach ($_SESSION['content'] as $userName => $session) {
            $accessGroups = array_merge($accessGroups, $session['groups']);
        }
    }
    $request = new ApiRequest(
        $method,
        substr($uri, 4),
        $queryString,
        $headers,
        $content,
        $accessGroups
    );
} elseif (strpos($uri, '/ui/') === 0 || $uri === '/ui') {
    require_once './engine/ui/ui.php';
    $request = new UiRequest(
        $method,
        substr($uri, 4),
        $queryString,
        $headers,
        $content
    );
} elseif (strpos($uri, '/doc/') === 0 || $uri === '/doc' || $uri === '/map') {
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
$status = $response->getStatus();
if ($isCli && array_get($options, 'verbose', false)) {
    echo 'Response:' . PHP_EOL;
    echo ' - status      : ' . $status . PHP_EOL;
    $headers = $response->getHeaders();
    if(empty($headers)){
      echo ' - headers     : none'. PHP_EOL;
    } else {
      echo ' - headers      '. PHP_EOL;
      foreach ($headers as $key => &$value) {
        echo "   - $key: $value ". PHP_EOL;
      }
    }
    $response->echo(false);
} else $response->echo();

if ($isCli && $status !== 200) exit($status); // Nb: exit code is 0-255 so 404 becomes 404%256 = 148
