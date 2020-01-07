<?php

require('./lib/router/query.php');

class HttpRequest2
{
    protected $method;
    protected $uri;
    protected $queryString;
    protected $headers;
    protected $content;

    public function __construct(string $method, string $uri, string $queryString, array $headers, string $content)
    {
        $this->method = $method;
        $this->uri = $uri;
        $this->queryString = $queryString;
        $this->headers = $headers;
        $this->content = $content;
    }
}

class ApiRequest extends HttpRequest2
{
    protected $storageRequests = [];

    private function add($requestId, string $method, string $entityClassList, string $entityId, string $property, $content, Query $query): void
    {
        $entityClasses = explode(',', $entityClassList);
        foreach ($entityClasses as $entityClass) {
            $entity = new Entity($entityClass); //TODO static
            $storageRequests = $entity->createStorageRequests($requestId, $method, $entityId, $property, $content, $query);
            foreach ($storageRequests as $storageString => $storageRequest) {
                if (!array_key_exists($storageString, $this->storageRequests)) {
                    $this->storageRequests[$storageString] = $storageRequests[$storageString];
                } else {
                    $this->storageRequests[$storageString]->merge($storageRequests[$storageString]);
                }
            }
        }
    }

    private function parseContent(): void
    {
        $path = explode('/', $this->uri);
        $entityClass = count($path) > 1 ? $path[1] : '*';
        $entityId = count($path) > 2 ? $path[2] : '*';
        $propertyName = count($path) > 3 ? $path[3] : '*';
        $query = new Query($this->queryString);
        if ($this->method === 'GET' || $this->method === 'DELETE' || $this->method === 'HEAD') {
            $this->add(null, $this->method, $entityClass, $entityId, $propertyName, null, $query);
        } elseif ($this->method === 'PUT') {
            $this->add(null, $this->method, $entityClass, $entityId, $propertyName, $this->content, $query);
        } elseif ($this->method === 'POST') { // Multi requests
            $jsonContent = json_decode($this->content, true); //TODO catch errors
            foreach ($jsonContent as $requestId => $subRequest) {
                $subEntityClass = array_get($subRequest, 'class', $entityClass);
                $subEntityId = array_get($subRequest, 'id', $entityId);
                $subPropertyName = array_get($subRequest, 'property', $propertyName);
                $subQuery = array_key_exists('query',$subRequest) ? $query->add($subRequest['query']) : $query;
                $subMethod = array_get($subRequest, 'method', 'GET');
                $subContent = array_get($subRequest, 'content', null);
                $this->add($requestId, $subMethod, $subEntityClass, $subEntityId, $subPropertyName, $subContent, $subQuery);
            }
        }
    }

    public function createResponse(): ApiResponse
    {
        $this->parseContent();
        $requestResponses = [];

        foreach ($this->storageRequests as $storageRequest) {

            $storageResponse = Storage::getStorageResponse($storageRequest);

            foreach ($storageResponse->getRequestResponses() as $requestId => $requestResponse) {
                if (!array_key_exists($requestId, $requestResponses)) {
                    $requestResponses[$requestId] = $requestResponse;
                } else {
                    $requestResponses[$requestId]->merge($requestResponse);
                }
            }
        }

        return new ApiResponse($this->method, $requestResponses);
    }
}

class UiRequest extends HttpRequest2
{

    public function createResponse(): UiResponse
    {
        $query = new Query($this->queryString);

        $path = explode('/', $this->uri);
        $display = count($path) > 0 ? $path[0] : '*';
        $entityClass = count($path) > 1 ? $path[1] : '*';
        $entityId = count($path) > 2 ? $path[2] : '*';
        $propertyName = count($path) > 3 ? $path[3] : '*';
        return new UiResponse($display,$entityClass, $entityId, $propertyName, $query);
    }
}

class ContentRequest extends HttpRequest2
{
    public function createResponse(): ContentResponse
    {
        return new ContentResponse($this->uri); //TODO pass other stuff? $method,$queryString,$headers,$content
    }
}
