<?php

class ApiRequest extends HttpRequest2
{
    protected $storageRequests = [];

    private function add($requestId, string $method, string $entityClassNameList, string $entityIdList, array $propertyPath, $content, Query $query): void
    {
        $entityClassNames = explode(',', $entityClassNameList);
        foreach ($entityClassNames as $entityClassName) {
            $entityClass = EntityClass::get($entityClassName);
            if (is_null($entityClass)) {
                //TODO
                echo 'ERROR' . $entityClassName . ' not found';
            } else {
                $entityClassContent = array_null_get($content, $entityClassName);
                $storageRequests = $entityClass->createStorageRequests($requestId, $method, $entityIdList, $propertyPath, $entityClassContent, $query);
                foreach ($storageRequests as $storageString => $storageRequest) {
                    if (!array_key_exists($storageString, $this->storageRequests)) {
                        $this->storageRequests[$storageString] = $storageRequests[$storageString];
                    } else {
                        $this->storageRequests[$storageString]->merge($storageRequests[$storageString]);
                    }
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
        } elseif ($this->method === 'PATCH' || $this->method === 'PUT' || $this->method === 'POST') {
            $jsonContent = json_decode($this->content, true); //TODO catch errors
            $this->add(null, $this->method, $entityClassList, $entityIdList, $propertyPath, $jsonContent, $query);
        } else {
            //TODO error unknown method
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

    public function createResponse()
    {
        if ($this->uri === '') {
            return new DocResponse('api' . $this->uri, 'API blabla');
        }

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

class ApiResponse extends HttpResponse2
{
    public function __construct(string $method, $requestResponses)
    {
        $count = count($requestResponses);
        if ($count == 0) {
            parent::__construct(400, 'Request was empty');
        } elseif ($method != 'POST') {
            $requestResponse = array_values($requestResponses)[0];
            $data = $requestResponse->getContent();
            parent::__construct($requestResponse->getStatus(), json_encode($data));
        } else {
            $data = [];
            foreach ($requestResponses as $requestId => $requestResponse) {
                $this->addStatus($requestResponse->getStatus());
                $data[$requestId] = [
                    'status' => $requestResponse->getStatus(),
                    'result' => $requestResponse->getContent(),
                ];
            }
            parent::__construct($this->status, json_encode($data));
        }
    }
}