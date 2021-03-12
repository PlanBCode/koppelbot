<?php

require 'internal.php';

function pathFromUri(string $uri)//TODO: ?array
{
    if (substr($uri, 0, 1) !== '/') return null;
    return explode('/', substr($uri, 1));
}

function getConnectorRequests(ApiRequest &$apiRequest, string $method, string $requestUri, string $content, string $entityClassList, string $entityIdList, array &$propertyPath, Query &$query, array &$accessGroups, $requestId = null): array
{
    $requestObject = new RequestObject($method, $requestId, $requestUri, $query, $accessGroups);

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
            foreach (array_reverse($path) as &$item) {
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


function addConnectorRequest(ApiRequest &$apiRequest, array &$connectorRequests, RequestObject &$requestObject, string $entityClassNameList, string $entityIdList, array $propertyPath, $content)//TODO : void
{
    $entityClassNames = explode(',', $entityClassNameList);
    foreach ($entityClassNames as $entityClassName) {
        $accessGroups = $requestObject->getAccessGroups();
        $entityClass = EntityClass::get($entityClassName, $accessGroups);
        if (is_null($entityClass)) {
            if ($entityClassName === '*') {
                $apiRequest->addError(400, 'Illegal full wildcard * request. Please specify entities.');
                $path = [$entityClassName];
                $apiRequest->addError(404, $entityClassName . ' not found', $path);
            }
        } else {
            $entityClassContent = array_null_get($content, $entityClassName);
            $entityClassConnectorRequests = $entityClass->createConnectorRequests($requestObject, $entityIdList, $propertyPath, $entityClassContent);
            foreach ($entityClassConnectorRequests as $connectorString => &$entityClassConnectorRequest) {
                if (!array_key_exists($connectorString, $connectorRequests)) {
                    $connectorRequests[$connectorString] = $entityClassConnectorRequest;
                } else {
                    $connectorRequests[$connectorString]->merge($entityClassConnectorRequest);
                }
            }
        }
    }
}

function addConnectorRequests(array &$a, array &$b){
  foreach ($b as $connectorString => $connectorRequest) {
    if(array_key_exists($connectorString,$a)){
      $a[$connectorString]->merge($connectorRequest);
    }else $a[$connectorString] = $connectorRequest;
  }
}

function addRequestResponse(ConnectorRequest &$connectorRequest, array &$requestResponses)//TODO : void
{
  $connectorResponse = Connector::getConnectorResponse($connectorRequest);
  foreach ($connectorResponse->getRequestResponses() as $requestId => &$requestResponse) {
      if (!array_key_exists($requestId, $requestResponses)) $requestResponses[$requestId] = $requestResponse;
      else $requestResponses[$requestId]->merge($requestResponse);
  }
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

    public function setMethod(string $method)//TODO : void
    {
      $this->method = $method;
    }

    public function getEntityIdList(): string
    {
        $path = $this->getPath();
        return array_get($path, 1, '*');
    }

    public function getPath(): array
    {
        return array_slice(explode('/', $this->requestUri), 1);
    }

    public function getAccessGroups(): array
    {
        return $this->accessGroups;
    }

    public function getUri(): string
    {
        return $this->requestUri;
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getQuery(): Query
    {
        return $this->query;
    }
}

function isSingularPath(array &$path): bool
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

    /** @var string[] */
    protected $path;

    /** @var ApiError[] */
    protected $errors;
    /** @var string[] */
    protected $accessGroups;

    public function __construct(string $method, string $uri, string $queryString, array $headers, string $content, array $accessGroups)
    {
        if (substr($uri, -1, 1) === '/') $uri = substr($uri, 0, -1); // '/a/b/c/' -> '/a/b/c'
        $this->path = array_slice(explode('/', $uri), 1); // '/a/b/c' -> ['a','b','c']
        $this->errors = [];
        $this->accessGroups = $accessGroups;
        parent::__construct($method, $uri, $queryString, $headers, $content);
    }

    public function addError(int $status, string $errorMessage, array &$path = [])//TODO : void
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


    /**
     * For reference types the underlying values need to be retrieved. Consider entity A with property b of entity B reference type:
     *  /A/entityId/b/myProperty  needs to retrieve /B/x/myProperty where x = /A/entityId/b
     * @param  array  $requestResponses            [description]
     * @param  array  $remainingConnectorRequests  [description]
     * @param  array  $remappedAutoIncrementedUris [description]
     * @return [type]                              [description]
     */
    protected function resolveReferenceResponses(array &$requestResponses, array &$remainingConnectorRequests, array &$remappedAutoIncrementedUris): array
    {
      $propertyResponseByReference = [];
      $pathsByReference = [];

      $referenceConnectorRequests = [];

      foreach ($remainingConnectorRequests as &$connectorRequest) {
          $connectorRequest->updateAutoIncrementedUris($remappedAutoIncrementedUris);
          addRequestResponse($connectorRequest, $requestResponses);
          foreach($connectorRequest->getPropertyRequests() as &$propertyRequest){

            if($propertyRequest->isReferenceRequest()){ // If reference type values and sub properties then resolve those

              $referenceUri = $propertyRequest->getProperty()->getSetting('uri'); // '/document/*'
              $referenceEntityClassName = explode('/',$referenceUri)[1]; // '/document/*' -> 'document'
              $referencePropertyPath = array_slice($propertyRequest->getReferencePropertyPath(),1);
              $referenceSubUri = implode('/',$referencePropertyPath);

              $entityClassName = $propertyRequest->getEntityClass();
              $entityId = $propertyRequest->getEntityIdList();
              $requestId = $propertyRequest->getRequestId();

              $requestResponse = $requestResponses[$requestId];
              $entityClassResponse = $requestResponse->getEntityClassResponses()[$entityClassName]; //TODO check
              $subUri = $propertyRequest->getSubUri();
              $entityResponses = $entityClassResponse->getEntityResponses();

              foreach ($entityResponses as $entityId => $entityResponse) {
                $propertyResponse = $entityResponse->getPropertyResponses()[$subUri]; //TODO check
                $referenceEntityId = $propertyResponse->getContent();
                $query = new Query(''); //TODO use reference uri querystring?
                $content = ''; // $propertyRequest->getContent(); //TODO stringify?
                $requestUri = '/'.$referenceEntityClassName."/".$referenceEntityId."/".$referenceSubUri;
                $referenceRequestId = $propertyRequest->getUri($entityId);

                $propertyResponseByReference[$referenceRequestId] = $propertyResponse;
                $pathsByReference[$referenceRequestId] = array_merge([$referenceEntityClassName,$referenceEntityId],$referencePropertyPath);
                $newConnectorRequests = getConnectorRequests($this, $this->method, $requestUri, $content, $referenceEntityClassName, $referenceEntityId, $referencePropertyPath, $query, $this->accessGroups, $referenceRequestId );
                addConnectorRequests($referenceConnectorRequests,$newConnectorRequests);
              }
            }
          }
      }

      if(!empty($referenceConnectorRequests)){
        $referenceRequestResponses = $this->getRequestResponses2($referenceConnectorRequests);
        foreach ($referenceRequestResponses as $referenceRequestId => &$requestResponse) {
          $propertyResponse = $propertyResponseByReference[$referenceRequestId];
          $path = $pathsByReference[$referenceRequestId];
          $entityClassResponse = $requestResponse->getEntityClassResponses()[$path[0]];
          $entityResponse = $entityClassResponse->getEntityResponses()[$path[1]];

          $content = $entityResponse->getContent();
          $status = $entityResponse->getStatus();

          $propertyResponse->setContent($content);
          $propertyResponse->setStatus($status);

        }
      }
      return $requestResponses;
    }

    protected function getRequestResponses2(array &$connectorRequests): array //TODO rename
    {
        $requestResponses = [];
        $remainingConnectorRequests = [];
        $remappedAutoIncrementedUris = [];

        // first handle all POST requests that contain the id property, the id value is required for remaining connector requests
        foreach ($connectorRequests as &$connectorRequest) {
            $postIdPropertyRequests = $connectorRequest->getPostIdPropertyRequests();
            if(!empty($postIdPropertyRequests)){
              addRequestResponse($connectorRequest, $requestResponses); // need to track which id's have been added
              foreach($postIdPropertyRequests as &$postIdPropertyRequest){ // map '$entityClassName/$stub' to '$entityClassName/$maxAutoIncrementedId'
                $entityClassName = $postIdPropertyRequest->getEntityClass();
                $entityId = $postIdPropertyRequest->getEntityId();
                $stubUri = $entityClassName . '/' . $entityId;
                $requestId = $postIdPropertyRequest->getRequestId();
                $requestResponse = $requestResponses[$requestId]; //TODO check
                $remappedAutoIncrementedUris += $requestResponse->getRemappedAutoIncrementedUris();
              }
            }else $remainingConnectorRequests[] = $connectorRequest;
        }
        return $this->resolveReferenceResponses($requestResponses, $remainingConnectorRequests, $remappedAutoIncrementedUris);
    }


    protected function getRequestResponses()
    {
        $entityClassList = count($this->path) > 0 ? $this->path[0] : '*';  //TODO helper function to split uri properly
        $entityIdList = count($this->path) > 1 ? $this->path[1] : '*';
        $propertyPath = count($this->path) > 2 ? array_slice($this->path, 2) : [];
        $requestURi = $this->uri;
        $queryConnectorRequests = $this->getQueryConnectorRequests($this->query);
        $queryRequestResponses = $this->getRequestResponses2($queryConnectorRequests);
        if (count($queryRequestResponses) > 0) {

            /** @var RequestResponse */
            $requestResponse = array_values($queryRequestResponses)[0];
            $status =   $requestResponse->getStatus();
            if($status !== 200){
              $this->addError($status, 'Bad filter request');
              return [];
            }
            $data = $requestResponse->getContent();

            //TODO handle failure
            $entityIds = $this->query->getMatchingEntityIds($data, $this->accessGroups);

            $offset = $this->query->getOption('offset', 0);
            if($offset !== 0 || $this->query->hasOption('limit')){
              $limit = $this->query->getOption('limit', count($entityIds));
              $entityIds = array_slice($entityIds, $offset, $limit);
            }

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
        return $this->getRequestResponses2($connectorRequests);
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

    protected function stringifyContent(&$content, $status): string
    {
        $output = $this->query->getOption('output');
        if($output ==='json' || is_null($output)){
          if (!$this->query->checkToggle('expand') && !is_array($content)) { // default to json
            return json_simpleEncode($content);
          } else {
            return json_encode($content, JSON_PRETTY_PRINT);
          }
        }else if($output === 'csv' && $status === 200){
          require_once('output/csv.php');
          return outputCSV($content, $this->query,$this->path);
        }else if($output === 'sql' && $status === 200){
          require_once('output/sql.php');
          return outputSQL($content, $this->query,$this->path);
        }else if($output === 'xml' && $status === 200){
          require_once('output/xml.php');
          return outputXML($content, $this->query,$this->path);
        }else if($output === 'yaml'){
          require_once('output/yaml.php');
          return outputYAML($content, $this->query,$this->path);
        }else if($output === 'php'){
          return serialize($content);
        }else {
          return 'Error Unknown output format '.$output; //TODO improve
        }
    }

    protected function getStatus(array &$requestResponses): int
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
    protected function nullifyHead207Response(&$content)//TODO : void
    {
      foreach($content as $key=>&$value){
        if($value['status']===207){
          $this->nullifyHead207Response($value['content']);
        }else $value['content']='';
      }
    }

    protected function createHeadResponse(int $status, array &$requestResponses): HttpResponse2
    {
      $headers = [];
      if($status === 207){
        $content = $this->createNonSingularContent($requestResponses);
        $this->nullifyHead207Response($content);
        $content = $this->stringifyContent($content, $status);
        return new HttpResponse2($status, $content, $headers);
      }else{
        $content = '';
        return new HttpResponse2($status, $content, $headers);
      }
    }

    public function createResponse(): HttpResponse2
    {
        if ($this->uri === '') {
          require_once 'landing.php';
          return new DocResponse('api' . $this->uri, $this->getQuery(), APILandingHtml());
        }
        $requestResponses = $this->getRequestResponses();
        $status = $this->getStatus($requestResponses);

        if ($this->method === 'HEAD') return $this->createHeadResponse($status,$requestResponses);
        else {
            $content = $this->createNonSingularContent($requestResponses);

            if (count($this->errors)) {
                $stringContent = '';
                foreach ($this->errors as &$error) {
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

                if ($stringContent !== '') {
                  $headers = [];
                  return new HttpResponse2(400, $stringContent, $headers);
                }
            }
            $headers = [];
            if (isSingularPath($this->path) && !$this->query->checkToggle('expand')) { //TODO and queryToggle 'serve'
                $entityClassName = $this->path[0];
                $entityClass = EntityClass::get($entityClassName, $this->accessGroups);
                if(is_null($entityClass)){
                  $stringContent = 'Unknown entity '.$entityClassName;
                  return new HttpResponse2($status, $stringContent, $headers);
                }
                $propertyPath = array_slice($this->path, 2);
                /** @var Property */
                $property = $entityClass->getProperty($propertyPath);
                if(is_null($property)) return  new HttpResponse2($status, $content, $headers);
                return $property->serveContent($status, $content);
            } else {
                $stringContent = $this->stringifyContent($content, $status);
                return new HttpResponse2($status, $stringContent, $headers);
            }
        }
    }

    public function getInternalApiResponse(): InternalApiResponse
    {
        return new InternalApiResponse($this->getRequestResponses());
    }
}
