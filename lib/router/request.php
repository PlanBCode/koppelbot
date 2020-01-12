<?php

require('./lib/router/query.php');

class HttpRequest2
{
    /** @var string */
    protected $method;
    /** @var string */
    protected $uri;
    /** @var string */
    protected $queryString;
    /** @var array */
    protected $headers;
    /** @var string */
    protected $content;

    public function __construct(string $method, string $uri, string $queryString, array $headers, string $content)
    {
        $this->method = $method;
        $uri = rtrim($uri, '/'); // remove trailing slashes
        $uri = preg_replace('/\/+/', '/', $uri); // remove multiple slashes
        $this->uri = $uri;
        $this->queryString = $queryString;
        $this->headers = $headers;
        $this->content = $content;
    }
}

class ApiRequest extends HttpRequest2
{
    protected $storageRequests = [];

    private function add($requestId, string $method, string $entityClassNameList, string $entityIdList, array $propertyPath, $content, Query $query): void
    {
        $entityClassNames = explode(',', $entityClassNameList);
        foreach ($entityClassNames as $entityClassName) {
            $entity = new Entity($entityClassName); //TODO static
            $entityClassContent = array_null_get($content,$entityClassName);
            $storageRequests = $entity->createStorageRequests($requestId, $method, $entityIdList, $propertyPath, $entityClassContent, $query);
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
        $entityClassList = count($path) > 1 ? $path[1] : '*';
        $entityIdList = count($path) > 2 ? $path[2] : '*';
        $propertyPath = count($path) > 3 ? array_slice($path, 3) : [];

        $query = new Query($this->queryString);
        if ($this->method === 'GET' || $this->method === 'DELETE' || $this->method === 'HEAD') {
            $this->add(null, $this->method, $entityClassList, $entityIdList, $propertyPath, null, $query);
        } elseif ($this->method === 'PATCH' || $this->method === 'PUT') {
            $jsonContent = json_decode($this->content, true); //TODO catch errors
            $this->add(null, $this->method, $entityClassList, $entityIdList, $propertyPath, $jsonContent, $query);
        }else if (  $this->method === 'POST'){
            // TODO to append arrays
        } else {
            //TODO error
        }
        /*
            foreach ($jsonContent as $requestId => $subRequest) {
                // TODO supplement with subUri?
                 $subEntityClass = array_get($subRequest, 'class', $entityClass);
                 $subEntityId = array_get($subRequest, 'id', $entityId);
                 $subPropertyName = array_get($subRequest, 'property', $propertyName);
                 //TODO property path
                 $subQuery = array_key_exists('query', $subRequest) ? $query->add($subRequest['query']) : $query;
                 $subMethod = array_get($subRequest, 'method', 'GET');
                 $subContent = array_get($subRequest, 'content', null);
                 $this->add($requestId, $subMethod, $subEntityClass, $subEntityId, $subPropertyName,$propertyPath, $subContent, $subQuery);
            }
        }*/
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
        $propertyPath = count($path) > 3 ? array_slice($path, 3) : [];
        return new UiResponse($display, $entityClass, $entityId, $propertyPath, $query);
    }
}

class ContentRequest extends HttpRequest2
{
    public function createResponse(): ContentResponse
    {
        return new ContentResponse($this->uri); //TODO pass other stuff? $method,$queryString,$headers,$content
    }
}
