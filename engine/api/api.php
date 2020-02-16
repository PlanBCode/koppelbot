<?php

function getConnectorRequests(string $method, string $content, string $entityClassList, string $entityIdList, array $propertyPath, Query &$query): array
{
    $connectorRequests = [];
    if ($method === 'GET' || $method === 'DELETE' || $method === 'HEAD') {
        addConnectorRequest($connectorRequests, null, $method, $entityClassList, $entityIdList, $propertyPath, null, $query);
    } elseif ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
        $jsonContent = json_decode($content, true); //TODO catch errors
        addConnectorRequest($connectorRequests, null, $method, $entityClassList, $entityIdList, $propertyPath, $jsonContent, $query);
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
             addConnectorRequest($connectorRequests, $requestId, $subMethod, $subEntityClass, $subEntityId, $subPropertyName,$propertyPath, $subContent, $subQuery);
        }
    }*/
    return $connectorRequests;
}


function addConnectorRequest(array &$connectorRequests, $requestId, string $method, string $entityClassNameList, string $entityIdList, array $propertyPath, $content, Query &$query): void
{
    $entityClassNames = explode(',', $entityClassNameList);
    foreach ($entityClassNames as $entityClassName) {
        $entityClass = EntityClass::get($entityClassName);
        if (is_null($entityClass)) {
            //TODO
            echo 'ERROR' . $entityClassName . ' not found';
        } else {
            $entityClassContent = array_null_get($content, $entityClassName);
            $entityClassConnectorRequests = $entityClass->createconnectorRequests($requestId, $method, $entityIdList, $propertyPath, $entityClassContent, $query);
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

class ApiRequest extends HttpRequest2
{

    public function getQueryConnectorRequests(Query &$query): array
    {
        $path = explode('/', $this->uri);
        $entityClassList = count($path) > 1 ? $path[1] : '*';
        $entityIdList = count($path) > 2 ? $path[2] : '*';

        $propertyNames = $query->getAllUsedPropertyNames();
        if (count($propertyNames) === 0) return [];
        if (count($propertyNames) !== 1){
            echo 'ERROR : multi property query not yet supported';
            //TODO transform into propertyTree
            return [];
        }
        $propertyPath = explode('.', $propertyNames[0]);

        /*    TODO use
         $limit = $query->get('limit');
         $offset = $query->get('offset','0');
         $sortBy = $query->get('sortBy');
        */
        return getConnectorRequests('GET', '', $entityClassList, $entityIdList, $propertyPath, $query);
    }

    public function createResponse()
    {
        if ($this->uri === '') {
            return new DocResponse('api' . $this->uri, 'API blabla');
        }
        $path = explode('/', $this->uri);
        $entityClassList = count($path) > 1 ? $path[1] : '*';
        $entityIdList = count($path) > 2 ? $path[2] : '*';
        $propertyPath = count($path) > 3 ? array_slice($path, 3) : [];

        $query = new Query($this->queryString);

        $queryConnectorRequests = $this->getQueryConnectorRequests($query);
        $queryRequestResponses = getRequestResponses($queryConnectorRequests);

        if (count($queryRequestResponses) > 0) {
            $requestResponse = array_values($queryRequestResponses)[0];
            $data = $requestResponse->getContent();
            $entityIds = $query->getMatchingEntityIds($data);
            $entityIdList = implode(',',$entityIds);
        }

        /*TODO optimization compare connector strings in $queryConnectorRequests and  $connectorRequests.
then decide to first get the query id's and update the $connectorRequests
before getting the actual data
*/
        $connectorRequests = getConnectorRequests($this->method, $this->content, $entityClassList, $entityIdList, $propertyPath, $query);

        $requestResponses = getRequestResponses($connectorRequests);
        return new ApiResponse($this->method, $requestResponses);
    }
}

class ApiResponse extends HttpResponse2
{
    public function __construct(string $method, $requestResponses)
    {
        $count = count($requestResponses);
        if ($count == 0) {
            parent::__construct(200, '{}');
        } else {
            $requestResponse = array_values($requestResponses)[0];
            $data = $requestResponse->getContent();
            parent::__construct($requestResponse->getStatus(), json_encode($data));
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