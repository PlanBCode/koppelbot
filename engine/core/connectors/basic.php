<?php

abstract class BasicConnector extends Connector
{
    public function createResponse(connectorRequest &$connectorRequest): ConnectorResponse
    {
        $connectorResponse = $this->open($connectorRequest);
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $propertyResponse = $this->createPropertyResponse($propertyRequest);
            $connectorResponse->merge($propertyResponse);
        }
        $closedConnectorResponse = $this->close($connectorRequest);
        return $connectorResponse->merge($closedConnectorResponse);
    }

    /**
     * @param PropertyRequest $propertyRequest
     *
     * @return ConnectorResponse|void
     */
    protected function createPropertyResponse(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        switch ($propertyRequest->getMethod()) {
            case 'GET':
                return $this->get($propertyRequest, false);
            case 'PATCH':
                return $this->patch($propertyRequest);//TODO use $this->put
            case 'POST':
                return $this->patch($propertyRequest);
            case 'PUT':
                return $this->patch($propertyRequest);
            case 'HEAD':
                return $this->get($propertyRequest, true);
            case 'DELETE':
                return $this->delete($propertyRequest);
            default: //TODO error
        }
    }

    abstract protected function open(connectorRequest &$connectorRequest): ConnectorResponse;

    abstract protected function close(connectorRequest &$connectorRequest): ConnectorResponse;

    protected function get(PropertyRequest &$propertyRequest, bool $head): ConnectorResponse
    {

        /*$modified_after = $propertyRequest->getQuery()->get('modified_after');
        $modified_after = is_string($modified_after)?intval($modified_after):null;
        if ($modified_after) {
            $filePath = $this->createFilePath($entityId);
            $create_time = filectime($filePath); // Note: this is not the actual create time on linux but the change time (change group, owner, file permissions)
            if ($create_time > $modified_after) {
                $returnStatus = 201; // Created
            } else {
                $modify_time = filemtime($filePath);
                if ($modify_time > $modified_after) {
                    $returnStatus =  200; // OK -> Modified
            } else {
                    // Not Modified, nothing to return
                    $returnStatus = 304;
                    $connectorResponse->add($returnStatus, $propertyRequest, $entityId, null);
                    return $connectorResponse;
                }
            }
        }else{
            $returnStatus = 200;
        }*/
        $connectorResponse = new ConnectorResponse();

        $entityIdList = $propertyRequest->getEntityIdList();
        if($entityIdList === '*' ){
            if(is_null($this->data)) $entityIds =[];
            else $entityIds =  array_keys($this->data);
        }else $entityIds = explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();

        $key = $propertyRequest->getProperty()->getConnectorSetting('key', '.' . $propertyName);
        $isId = $propertyRequest->getProperty()->isId() || $key === 'basename' || $key === 'key';
        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                if ($isId) {
                    $content = $entityId;
                    $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                } else {
                    if ($key === 'content') {
                        $entity =& $this->data[$entityId];
                        $keyPath = [];
                    } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                        $entity =& $this->data[$entityId];
                        $keyPath = explode('.', substr($key, 1));
                    } elseif (is_string($key)) {
                        $entity =& $this->meta[$entityId];
                        $keyPath = explode('.', $key);
                    } else {
                        $content = 'Incorrect connector setting key="' . $key . '".';
                        $connectorResponse->add(500, $propertyRequest, $entityId, $content);
                        continue;
                    }
                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                    $mergedPath = array_merge($keyPath, $subPropertyPath);
                    $jsonActionResponse = json_get($entity, $mergedPath);
                    if ($jsonActionResponse->succeeded()) {
                        $content = $head ? null : $jsonActionResponse->content;
                        $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $content = 'Not found';
                        $connectorResponse->add(404, $propertyRequest, $entityId, $content);
                    }
                }
            } else {
                $content = 'Not found';
                $connectorResponse->add(404, $propertyRequest, $entityId, $content);//TODO
            }

        }
        return $connectorResponse;
    }

    protected function patch(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        $entityIdList = $propertyRequest->getEntityIdList();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getConnectorSetting('key', '.' . $propertyName);
        $isId = $propertyRequest->getProperty()->isId() || $key === 'basename' || $key === 'key';

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (!array_key_exists($entityId, $this->data)) {
                $this->data[$entityId] = [];
            }
            if ($isId) { //TODO or filename?

                $newContent = $propertyRequest->getMethod() === 'POST'
                ? $entityId
                : $propertyRequest->getContent();

                //TODO or extension is mixed extensions for example "json|xml"
                $newContent = $this->extension === '*' ? $newContent : basename($newContent, '.' . $this->extension);
                if ($newContent !== $entityId) {
                    $this->data[$newContent] = $this->data[$entityId];
                    $this->data[$entityId] = null;
                    unset($this->data[$entityId]);
                }
                $connectorResponse->add(200, $propertyRequest, $newContent, $newContent);
            } else if ($key === 'mime' || $key === 'extension' || $key === 'size') {
                // TODO if mime or size provided?
                $connectorResponse->add(200, $propertyRequest, $entityId, null);
            } else {
                if ($key === "content") {
                    $keyPath = [];
                } else if (is_string($key) && substr($key, 0, 1) === '.') {
                    $keyPath = explode('.', substr($key, 1));
                } else {
                    $content = 'Incorrect connector setting key="' . $key . '".';
                    $connectorResponse->add(500, $propertyRequest, $entityId, $content);//TODO
                    continue;
                }
                $entity =& $this->data[$entityId];

                $newContent = $propertyRequest->getContent();
                $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());

                $jsonActionResponseGet = json_get($entity, array_merge($keyPath, $subPropertyPath));
                $currentContent = $jsonActionResponseGet->succeeded() ? $jsonActionResponseGet->content : null;

                $processResponse = $propertyRequest->processBeforeConnector($newContent, $currentContent);

                if (!$processResponse->succeeded()) {
                    $connectorResponse->add($processResponse->getStatus(), $propertyRequest, $entityId, $processResponse->getError());
                    continue;
                }

                $newContent = $processResponse->getContent();
                $jsonActionResponseSet = json_set($entity, array_merge($keyPath, $subPropertyPath), $newContent);
                if ($jsonActionResponseSet->succeeded()) {
                    //TODO update to 204
                    $connectorResponse->add(200, $propertyRequest, $entityId, $jsonActionResponseSet->content);
                } else {
                    //TODO use $jsonActionResponseSet->getErrorMessage()
                    //TODO might result in 404 or 500
                    $content =  'Not found';
                    $connectorResponse->add(404, $propertyRequest, $entityId,$content);
                }
            }
        }
        return $connectorResponse;
    }

    protected function delete(PropertyRequest $propertyRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        $entityIdList = $propertyRequest->getEntityIdList();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getConnectorSetting('key', '.' . $propertyName);
        $isId = $propertyRequest->getProperty()->isId() || $key === 'basename' || $key === 'key';
        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                if ($isId) {
                    unset($this->data[$entityId]);
                    $content = null;
                    $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                } else {
                    $entity =& $this->data[$entityId];
                    if ($key === 'content') {
                        $keyPath = [];
                        $content = null;
                        $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                    } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                        $keyPath = explode('.', substr($key, 1));
                    } else if ($key === 'mime' || $key === 'extension' || $key === 'size') {
                        $content = null;
                        $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                    } else {
                      $content = 'Incorrect connector setting key="' . $key . '".';
                        $connectorResponse->add(500, $propertyRequest, $entityId, $content);//TODO
                        continue;
                    }
                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                    $jsonActionResponse = json_unset($entity, array_merge($keyPath, $subPropertyPath));
                    if ($jsonActionResponse->succeeded()) {
                        //TODO update to 204
                        $content = null;
                        $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $content = 'Not found';
                        $connectorResponse->add(404, $propertyRequest, $entityId, $content);
                    }

                }
            } else {
                $content = 'Not found';
                $connectorResponse->add(404, $propertyRequest, $entityId, $content);//TODO
            }
        }
        return $connectorResponse;
    }

    /* TODO
       abstract protected function put(PropertyRequest $propertyRequest): ConnectorResponse;
        abstract protected function post(PropertyRequest $propertyRequest): ConnectorResponse;
    */

}
