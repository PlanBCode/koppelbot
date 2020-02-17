<?php

abstract class BasicConnector extends Connector
{
    public function createResponse(connectorRequest $connectorRequest): connectorResponse
    {
        $connectorResponse = $this->open($connectorRequest);
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $connectorResponse->merge($this->createPropertyResponse($propertyRequest));
        }
        return $connectorResponse->merge($this->close($connectorRequest));
    }

    /**
     * @param PropertyRequest $propertyRequest
     *
     * @return connectorResponse|void
     */
    protected function createPropertyResponse(PropertyRequest $propertyRequest)
    {
        switch ($propertyRequest->getMethod()) {
            case 'GET':
                return $this->get($propertyRequest);
            case 'PATCH':
                return $this->patch($propertyRequest);//TODO use $this->put
            case 'POST':
                return $this->patch($propertyRequest);
            case 'PUT':
                return $this->patch($propertyRequest);
            case 'HEAD':
                return $this->head($propertyRequest);
            case 'DELETE':
                return $this->delete($propertyRequest);
            default: //TODO error
        }
    }

    abstract protected function open(connectorRequest $connectorRequest): connectorResponse;

    abstract protected function close(connectorRequest $connectorRequest): connectorResponse;

    protected function get(PropertyRequest $propertyRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();

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

        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getConnectorSetting('key', '.' . $propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                if ($key === 'basename' || $key === 'key') {
                    $content = $entityId;
                    $connectorResponse->add(200, $propertyRequest, $entityId, $content);
                } else {
                    if ($key === 'content') {
                        $entity = $this->data[$entityId];
                        $keyPath = [];
                    } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                        $entity = $this->data[$entityId];
                        $keyPath = explode('.', substr($key, 1));
                    } elseif (is_string($key)) {
                        $entity = $this->meta[$entityId];
                        $keyPath = explode('.', $key);
                    } else {
                        $connectorResponse->add(500, $propertyRequest, $entityId, 'Incorrect connector setting key="' . $key . '".');//TODO
                        continue;
                    }
                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                    $jsonActionResponse = json_get($entity, array_merge($keyPath, $subPropertyPath));
                    if ($jsonActionResponse->succeeded()) {
                        $connectorResponse->add(200, $propertyRequest, $entityId, $jsonActionResponse->content);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $connectorResponse->add(404, $propertyRequest, $entityId, 'Not found');
                    }

                }
            } else {
                $connectorResponse->add(404, $propertyRequest, $entityId, 'Not found');//TODO
            }
        }
        return $connectorResponse;
    }

    protected function patch(PropertyRequest $propertyRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getConnectorSetting('key', '.' . $propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {

            if ($propertyRequest->getMethod() === 'POST') {
                $entityId = $this->getAutoIncrementedId($entityId);
                /*TODO if (is_null($entityId)) {
                    echo "failed to autoincrement";
                }*/
            }

            if (!array_key_exists($entityId, $this->data)) {
                $this->data[$entityId] = [];
            }
            if ($key === "basename" || $key === "key") { //TODO or filename?
                if ($propertyRequest->getMethod() === 'POST') {
                    $newContent = $entityId;
                } else {
                    $newContent = $propertyRequest->getContent();
                }
                //TODO or extension is mixed extensions for example "json|xml"
                $newContent = $this->extension === '*' ? $newContent : basename($newContent, '.' . $this->extension);
                if ($newContent !== $entityId) {
                    $this->data[$newContent] = $this->data[$entityId];
                    $this->data[$entityId] = null;
                    unset($this->data[$entityId]);
                }
                $connectorResponse->add(200, $propertyRequest, $newContent, $newContent);
            } else {
                if ($key === "content") {
                    $keyPath = [];
                } else if (is_string($key) && substr($key, 0, 1) === '.') {
                    $keyPath = explode('.', substr($key, 1));
                } else {
                    $connectorResponse->add(500, $propertyRequest, $entityId, 'Incorrect connector setting key="' . $key . '".');//TODO
                    continue;
                }

                $newContent = $propertyRequest->getContent();
                $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());

                $jsonActionResponseGet = json_get($this->data[$entityId], array_merge($keyPath, $subPropertyPath));
                $currentContent = $jsonActionResponseGet->succeeded() ? $jsonActionResponseGet->content : null;

                $processResponse = $propertyRequest->processBeforeConnector($newContent, $currentContent);

                if (!$processResponse->succeeded()) {
                    $connectorResponse->add($processResponse->getStatus(), $propertyRequest, $entityId, $processResponse->getError());
                    continue;
                }

                $newContent = $processResponse->getContent();
                $jsonActionResponseSet = json_set($this->data[$entityId], array_merge($keyPath, $subPropertyPath), $newContent);
                if ($jsonActionResponseSet->succeeded()) {
                    //TODO update to 204
                    $connectorResponse->add(200, $propertyRequest, $entityId, $jsonActionResponseSet->content);
                } else {
                    //TODO use $jsonActionResponseSet->getErrorMessage()
                    //TODO might result in 404 or 500
                    $connectorResponse->add(404, $propertyRequest, $entityId, 'Not found');
                }
            }
        }
        return $connectorResponse;
    }

    protected function delete(PropertyRequest $propertyRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getConnectorSetting('key', '.' . $propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                $entity =& $this->data[$entityId];
                if ($key === 'basename' || $key === 'key') {
                    $connectorResponse->add(400, $propertyRequest, $entityId, 'Illegal delete request');
                } else {
                    if ($key === 'content') {
                        $connectorResponse->add(400, $propertyRequest, $entityId, 'Illegal delete request');
                        continue;
                    } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                        $keyPath = explode('.', substr($key, 1));
                    } else {
                        $connectorResponse->add(500, $propertyRequest, $entityId, 'Incorrect connector setting key="' . $key . '".');//TODO
                        continue;
                    }
                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                    $jsonActionResponse = json_unset($entity, array_merge($keyPath, $subPropertyPath));
                    if ($jsonActionResponse->succeeded()) {
                        //TODO update to 204
                        $connectorResponse->add(200, $propertyRequest, $entityId, null);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $connectorResponse->add(404, $propertyRequest, $entityId, 'Not found');
                    }

                }
            } else {
                $connectorResponse->add(404, $propertyRequest, $entityId, 'Not found');//TODO
            }
        }
        return $connectorResponse;
    }

    /* TODO
       abstract protected function put(PropertyRequest $propertyRequest): ConnectorResponse;
        abstract protected function post(PropertyRequest $propertyRequest): ConnectorResponse;
    */

    abstract protected function head(PropertyRequest $propertyRequest): connectorResponse;

}
