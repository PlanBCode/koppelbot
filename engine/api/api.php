<?php

require 'internal.php';

function getConnectorRequests(string $method, string $requestUri, string $content, string $entityClassList, string $entityIdList, array $propertyPath, Query &$query): array
{
    $requestObject = new RequestObject($method, null, $requestUri, $query);

    $connectorRequests = [];
    if ($method === 'GET' || $method === 'DELETE' || $method === 'HEAD') {
        addConnectorRequest($connectorRequests, $requestObject, $entityClassList, $entityIdList, $propertyPath, null);
    } elseif ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
        $jsonContent = json_decode($content, true); //TODO catch errors
        addConnectorRequest($connectorRequests, $requestObject, $entityClassList, $entityIdList, $propertyPath, $jsonContent);
    } else {
        //TODO error unknown method
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


function addConnectorRequest(array &$connectorRequests, RequestObject &$requestObject, string $entityClassNameList, string $entityIdList, array $propertyPath, $content): void
{
    $entityClassNames = explode(',', $entityClassNameList);
    foreach ($entityClassNames as $entityClassName) {
        $entityClass = EntityClass::get($entityClassName);
        if (is_null($entityClass)) {
            //TODO
            echo 'ERROR' . $entityClassName . ' not found';
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

function getRequestResponses($connectorRequests): array
{
    $requestResponses = [];
    foreach ($connectorRequests as $connectorRequest) {
        $connectorResponse = Connector::getConnectorResponse($connectorRequest);

        foreach ($connectorResponse->getRequestResponses() as $requestId => $requestResponse) {
            if (!array_key_exists($requestId, $requestResponses)) {
                $requestResponses[$requestId] = $requestResponse;
            } else {
                $requestResponses[$requestId]->merge($requestResponse);
            }
        }
    }
    return $requestResponses;
}

class RequestObject
{
    protected $method;
    protected $requestId;
    protected $requestUri;
    protected $query;

    public function __construct(string $method, $requestId, string $requestUri, Query &$query)
    {
        $this->method = $method;
        $this->requestId = $requestId;
        $this->requestUri = $requestUri;
        $this->query = $query;
    }

    public function getId()
    {
        return $this->requestId;
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getUri(): string
    {
        return $this->requestUri;
    }

    public function getQuery(): Query
    {
        return $this->query;
    }

    public function getPath(): array
    {
        return array_slice(explode('/', $this->requestUri), 1);
    }

    public function isSingular(): bool
    {
        foreach ($this->getPath() as $property) {
            if ($property === '*' || strpos($property, ',') !== false) return false;
        }
        return true;
    }
}

class ApiRequest extends HttpRequest2
{
    /** @var Query */
    protected $query;

    public function __construct(string $method, string $uri, string $queryString, array $headers, string $content)
    {
        $this->query = new Query($queryString);
        parent::__construct($method, $uri, $queryString, $headers, $content);
    }

    public function getQueryConnectorRequests(Query &$query): array
    {
        $path = explode('/', $this->uri);
        $entityClassList = count($path) > 1 ? $path[1] : '*';
        $entityIdList = count($path) > 2 ? $path[2] : '*';
        $propertyNames = $query->getAllUsedPropertyNames();
        if (count($propertyNames) === 0) return [];
        if (count($propertyNames) !== 1) {
            echo 'ERROR : multi property query not yet supported';
            //TODO transform into propertyTree
            return [];
        }
        $propertyPath = explode('.', $propertyNames[0]);
        $requestURi = '/' . $entityClassList . '/' . $entityIdList . '/' . $propertyNames[0]; //TODO tree
        $queryString = $this->queryString . '&expand'; //TODO add better
        $otherQuery = new Query($queryString);
        /*    TODO use
         $limit = $query->get('limit');
         $offset = $query->get('offset','0');
         $sortBy = $query->get('sortBy');
        */
        return getConnectorRequests('GET', $requestURi, '', $entityClassList, $entityIdList, $propertyPath, $otherQuery);
    }

    protected function getRequestResponses()
    {
        $path = explode('/', $this->uri);
        $entityClassList = count($path) > 1 ? $path[1] : '*';
        $entityIdList = count($path) > 2 ? $path[2] : '*';
        $propertyPath = count($path) > 3 ? array_slice($path, 3) : [];
        $requestURi = $this->uri;

        $queryConnectorRequests = $this->getQueryConnectorRequests($this->query);
        $queryRequestResponses = getRequestResponses($queryConnectorRequests);

        if (count($queryRequestResponses) > 0) {

            $requestResponse = array_values($queryRequestResponses)[0];
            $data = $requestResponse->getContent();
            //TODO handle failure
            $entityIds = $this->query->getMatchingEntityIds($data);
            $entityIdList = implode(',', $entityIds);
        }
        /*TODO optimization compare connector strings in $queryConnectorRequests and  $connectorRequests.
then decide to first get the query id's and update the $connectorRequests
before getting the actual data
*/
        $connectorRequests = getConnectorRequests($this->method, $requestURi, $this->content, $entityClassList, $entityIdList, $propertyPath, $this->query);
        return getRequestResponses($connectorRequests);
    }

    public function createResponse()
    {
        if ($this->uri === '') {
            return new DocResponse('api' . $this->uri, 'API blabla');
        }

        return new ApiResponse($this->method, $this->query, $this->getRequestResponses());
    }

    public function getInternalApiResponse(): InternalApiResponse
    {
        return new InternalApiResponse($this->getRequestResponses());
    }
}

class ApiResponse extends HttpResponse2
{
    public function __construct(string $method, Query &$query, $requestResponses)
    {
        $count = count($requestResponses);
        if ($count == 0) {
            parent::__construct(200, '{}');
        } else {
            /** @var  RequestResponse */
            $requestResponse = array_values($requestResponses)[0];
            $data = $requestResponse->getContent();
            if (!$query->checkToggle('expand') && !is_array($data)) {
                if (is_string($data) || is_numeric($data)) {
                    $content = $data;
                } else {
                    $content = '';
                }
            } else {
                $content = json_encode($data, JSON_PRETTY_PRINT);
            }
            parent::__construct($requestResponse->getStatus(), $content);
        }
        /* } else { //TODO multi request
             $data = [];
             foreach ($requestResponses as $requestId => $requestResponse) {
                 $this->addStatus($requestResponse->getStatus());
                 $data[$requestId] = [
                     'status' => $requestResponse->getStatus(),
                     'result' => $requestResponse->getContent(),
                 ];
             }
             parent::__construct($this->status, json_encode($data));
         }*/
    }
}

