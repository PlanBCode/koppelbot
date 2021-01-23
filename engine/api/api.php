<?php

require 'internal.php';

function pathFromUri(string $uri): ?array
{
    if (substr($uri, 0, 1) !== '/') return null;
    return explode('/', substr($uri, 1));
}

function getConnectorRequests(ApiRequest &$apiRequest, string $method, string $requestUri, string $content, string $entityClassList, string $entityIdList, array $propertyPath, Query &$query, array &$accessGroups): array
{
    $requestObject = new RequestObject($method, null, $requestUri, $query, $accessGroups);

    $connectorRequests = [];
    if ($method === 'GET' || $method === 'DELETE' || $method === 'HEAD') {
        addConnectorRequest($apiRequest, $connectorRequests, $requestObject, $entityClassList, $entityIdList, $propertyPath, null);
    } elseif ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {

        $jsonContent = json_decode($content, true);

        if (!$query->checkToggle('expand')) {
            $jsonContent = is_null($jsonContent) // TODO somehow decide on json decoding based on property type
                ? $content
                : $jsonContent;
            $path = pathFromUri($requestUri);
            foreach (array_reverse($path) as $item) {
                $jsonContent = [$item => $jsonContent];
            }
        }
        if (is_null($jsonContent)) {
            $apiRequest->addError(400, 'Could not parse JSON: ' . json_last_error_msg() . '.');
        } else {
            addConnectorRequest($apiRequest, $connectorRequests, $requestObject, $entityClassList, $entityIdList, $propertyPath, $jsonContent);
        }
    } else {
        $apiRequest->addError(400, 'Unknown method: ' . $method);
    }
    /*  TODO multi request
        foreach ($jsonContent as $requestId => $subRequest) {
            // TODO supplement with subUri?
             $subEntityClass = array_get($subRequest, 'class', $entityClass);
             $subEntityId = array_get($subRequest, 'id', $entityId);
             $subPropertyName = array_get($subRequest, 'property', $propertyName);
             //TODO property path
             $subQuery = array_key_exists('query', $subRequest) ? $query->add($subRequest['query']) : $query;
             $subMethod = array_get($subRequest, 'method', 'GET');
             $subContent = array_get($subRequest, 'content', null);
             addConnectorRequest($connectorRequests, $subRequestObject, $subEntityClass, $subEntityId, $subPropertyName,$propertyPath, $subContent);
        }
    }*/
    return $connectorRequests;
}


function addConnectorRequest(ApiRequest &$apiRequest, array &$connectorRequests, RequestObject &$requestObject, string $entityClassNameList, string $entityIdList, array $propertyPath, $content): void
{
    $entityClassNames = explode(',', $entityClassNameList);
    foreach ($entityClassNames as $entityClassName) {
        $entityClass = EntityClass::get($entityClassName, $requestObject->getAccessGroups());
        if (is_null($entityClass)) {
            if ($entityClassName === '*') {
                $apiRequest->addError(400, 'Illegal full wildcard * request. Please specify entities.');
                $path = [$entityClassName];
                $apiRequest->addError(404, $entityClassName . ' not found', $path);
            }
        } else {
            $entityClassContent = array_null_get($content, $entityClassName);
            $entityClassConnectorRequests = $entityClass->createConnectorRequests($requestObject, $entityIdList, $propertyPath, $entityClassContent);
            foreach ($entityClassConnectorRequests as $connectorString => $entityClassConnectorRequest) {
                if (!array_key_exists($connectorString, $connectorRequests)) {
                    $connectorRequests[$connectorString] = $entityClassConnectorRequest;
                } else {
                    $connectorRequests[$connectorString]->merge($entityClassConnectorRequest);
                }
            }
        }
    }
}

function addRequestResponse(ConnectorRequest &$connectorRequest, array &$requestResponses): void
{
  $connectorResponse = Connector::getConnectorResponse($connectorRequest);
  foreach ($connectorResponse->getRequestResponses() as $requestId => $requestResponse) {
      if (!array_key_exists($requestId, $requestResponses)) {
          $requestResponses[$requestId] = $requestResponse;
      } else {
          $requestResponses[$requestId]->merge($requestResponse);
      }
  }
}

function getRequestResponses(array &$connectorRequests): array
{
    $requestResponses = [];
    $remainingConnectorRequests = [];
    $remappedAutoIncrementedUris = [];

    // first handle all POST requests that contain the id property, the id value is required for remaining connector requests
    foreach ($connectorRequests as $connectorRequest) {
        $postIdPropertyRequests = $connectorRequest->getPostIdPropertyRequests();
        if(!empty($postIdPropertyRequests)){
          addRequestResponse($connectorRequest, $requestResponses); // need to track which id's have been added
          foreach($postIdPropertyRequests as $postIdPropertyRequest){ // map '$entityClassName/$stub' to '$entityClassName/$maxAutoIncrementedId'
            $entityClassName = $postIdPropertyRequest->getEntityClass();
            $entityId = $postIdPropertyRequest->getEntityId();
            $stubUri = $entityClassName . '/' . $entityId;
            $requestId = $postIdPropertyRequest->getRequestId();
            $requestResponse = $requestResponses[$requestId]; //TODO check
            $remappedAutoIncrementedUris += $requestResponse->getRemappedAutoIncrementedUris();
          }
        }else $remainingConnectorRequests[] = $connectorRequest;
    }

    foreach ($remainingConnectorRequests as $connectorRequest) {
        $connectorRequest->updateAutoIncrementedUris($remappedAutoIncrementedUris);
        addRequestResponse($connectorRequest, $requestResponses);
    }
    return $requestResponses;
}

class RequestObject
{
    protected $method;
    protected $requestId;
    protected $requestUri;
    protected $query;
    protected $accessGroups;

    public function __construct(string $method, $requestId, string $requestUri, Query &$query, array &$accessGroups)
    {
        $this->method = $method;
        $this->requestId = $requestId;
        $this->requestUri = $requestUri;
        $this->query = $query;
        $this->accessGroups = $accessGroups;
    }

    public function getId()
    {
        return $this->requestId;
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function setMethod(string $method): void
    {
      $this->method = $method;
    }

    public function getUri(): string
    {
        return $this->requestUri;
    }

    public function getQuery(): Query
    {
        return $this->query;
    }

    public function getEntityIdList(): string
    {
        return array_get($this->getPath(), 1, '*');
    }

    public function getPath(): array
    {
        return array_slice(explode('/', $this->requestUri), 1);
    }

    public function getAccessGroups(): array
    {
        return $this->accessGroups;
    }

}

function isSingularPath(array $path): bool
{
    $pathLength = count($path);
    if ($pathLength <= 2) return false; // at least a property needs to be defined
    foreach ($path as $item) {
        if ($item === '*' || stripos($item, ',') !== false) return false;
    }
    return true;
}

class ApiError
{
    protected $status;
    protected $errorMessage;
    protected $path;

    public function __construct(int $status, string $errorMessage, array &$path)
    {
        $this->status = $status;
        $this->errorMessage = $errorMessage;
        $this->path = $path;
    }

    public function getErrorMessage(): string
    {
        return $this->errorMessage;
    }

    public function getPath(): array
    {
        return $this->path;
    }

    public function getStatus(): int
    {
        return $this->status;
    }

}

class ApiRequest extends HttpRequest2
{
    /** @var Query */
    protected $query;
    /** @var string[] */
    protected $path;

    /** @var ApiError[] */
    protected $errors;
    /** @var string[] */
    protected $accessGroups;

    public function __construct(string $method, string $uri, string $queryString, array $headers, string $content, array $accessGroups)
    {
        $this->query = new Query($queryString);
        if (substr($uri, -1, 1) === '/') $uri = substr($uri, 0, -1); // '/a/b/c/' -> '/a/b/c'
        $this->path = array_slice(explode('/', $uri), 1); // '/a/b/c' -> ['a','b','c']
        $this->errors = [];
        $this->accessGroups = $accessGroups;
        parent::__construct($method, $uri, $queryString, $headers, $content);
    }

    public function addError(int $status, string $errorMessage, array &$path = []): void
    {
        $this->errors[] = new ApiError($status, $errorMessage, $path);
    }

    public function getQueryConnectorRequests(Query &$query): array
    {
        $path = explode('/', $this->uri); //TODO helper function to split uri properly
        $entityClassList = count($path) > 1 ? $path[1] : '*';
        $entityIdList = count($path) > 2 ? $path[2] : '*';
        $propertyNames = $query->getAllUsedPropertyNames();

        if ($query->hasOption('sortBy')) {
            $propertyNames[] = $query->getOption('sortBy');
        }

        if ($query->hasOption('search')) $propertyNames = ['*'];
        else if (count($propertyNames) === 0) return [];

        if (count($propertyNames) !== 1) {
            $this->addError(500, 'multi property query not yet supported');
            //TODO transform into propertyTree
            return [];
        }
        $propertyPath = explode('.', $propertyNames[0]);
        $requestURi = '/' . $entityClassList . '/' . $entityIdList . '/' . $propertyNames[0]; //TODO tree
        $queryString = mergeQueryStrings($this->queryString, 'expand');
        $otherQuery = new Query($queryString);
        return getConnectorRequests($this, 'GET', $requestURi, '', $entityClassList, $entityIdList, $propertyPath, $otherQuery, $this->accessGroups);
    }

    protected function getRequestResponses()
    {
        $entityClassList = count($this->path) > 0 ? $this->path[0] : '*';  //TODO helper function to split uri properly
        $entityIdList = count($this->path) > 1 ? $this->path[1] : '*';
        $propertyPath = count($this->path) > 2 ? array_slice($this->path, 2) : [];
        $requestURi = $this->uri;
        $queryConnectorRequests = $this->getQueryConnectorRequests($this->query);
        $queryRequestResponses = getRequestResponses($queryConnectorRequests);

        if (count($queryRequestResponses) > 0) {

            /** @var RequestResponse */
            $requestResponse = array_values($queryRequestResponses)[0];
            $data = $requestResponse->getContent();

            //TODO handle failure
            $entityIds = $this->query->getMatchingEntityIds($data, $this->accessGroups);

            if ($this->query->hasOption('search')) {
                $search = $this->query->getOption('search');
                $entityClassData = array_values($data)[0]; // TODO implement or error for multi class
                // filter entity ids that do not contain the search string
                $entityIds = array_filter($entityIds, function ($entityId) use ($entityClassData, $search) {
                    return json_search($entityClassData[$entityId], $search);;
                });
            }
            if(empty($entityIds)) return [];
            $entityIdList = implode(',', $entityIds);
        }
        /*TODO optimization compare connector strings in $queryConnectorRequests and  $connectorRequests.
    then decide to first get the query id's and update the $connectorRequests
    before getting the actual data
    */
        $connectorRequests = getConnectorRequests($this, $this->method, $requestURi, $this->content, $entityClassList, $entityIdList, $propertyPath, $this->query, $this->accessGroups);
        return getRequestResponses($connectorRequests);
    }


    protected function createNonSingularContent(array &$requestResponses)
    {
        $count = count($requestResponses);
        if ($count === 0) {
            return [];
        } else { //TODO handle multi requests
            /** @var RequestResponse */
            $requestResponse = array_values($requestResponses)[0]; // TODO because non multi request
            return $requestResponse->getContent();
        }
    }

    protected function stringifyContent($content): string
    {
        if (!$this->query->checkToggle('expand') && !is_array($content)) {
            return json_simpleEncode($content);
        } else {
            return json_encode($content, JSON_PRETTY_PRINT);
        }
    }

    protected function getStatus(array &$requestResponses)
    {
        $count = count($requestResponses);
        if ($count == 0) {
            return 200;
        } else {
            /** @var RequestResponse */
            $requestResponse = array_values($requestResponses)[0]; // TODO because non multi request
            return $requestResponse->getStatus();
        }
    }

    public function createResponse()
    {
        if ($this->uri === '') {
            return new DocResponse('api' . $this->uri, 'API blabla');
        }

        $requestResponses = $this->getRequestResponses();
        $status = $this->getStatus($requestResponses);

        if ($this->method === 'HEAD') {
            return new HttpResponse2($status, '', []);
        } else {
            $content = $this->createNonSingularContent($requestResponses);

            if (count($this->errors)) {
                $stringContent = '';
                foreach ($this->errors as $error) {
                    $path = $error->getPath();
                    if (count($path) === 0) {
                        $stringContent .= $error->getErrorMessage();
                    } else {
                        if ($content === null) {
                            $content = [];
                            json_set($content, $path, $error->getErrorMessage());
                            $status = $error->getStatus();

                        } else {  //TODO add error properly
                            echo $status . '<br/>';
                            echo implode('/', $path) . ' ' . $error->getErrorMessage() . '<br/>';;
                        }
                    }
                }
                if ($stringContent !== '') return new HttpResponse2(400, $stringContent, []);
            }

            if (isSingularPath($this->path) && !$this->query->checkToggle('expand')) { //TODO and queryToggle 'serve'
                $entityClassName = $this->path[0];
                $entityClass = EntityClass::get($entityClassName, $this->accessGroups);
                $propertyPath = array_slice($this->path, 2);
                /** @var Property */
                $property = $entityClass->getProperty($propertyPath);
                return $property->serveContent($status, $content);
            } else {
                $stringContent = $this->stringifyContent($content);
                return new HttpResponse2($status, $stringContent, []);
            }
        }
    }

    public function getInternalApiResponse(): InternalApiResponse
    {
        return new InternalApiResponse($this->getRequestResponses());
    }
}
