<?php

abstract class BasicStorage extends Storage
{
    public function createResponse(StorageRequest $storageRequest): StorageResponse
    {
        $storageResponse = $this->open($storageRequest);
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            $storageResponse->merge($this->createPropertyResponse($propertyRequest));
        }
        $storageResponse->merge($this->close($storageRequest));

        return $storageResponse;
    }

    /**
     * @param PropertyRequest $propertyRequest
     *
     * @return StorageResponse|void
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

    abstract protected function open(StorageRequest $storageRequest): StorageResponse;

    abstract protected function close(StorageRequest $storageRequest): StorageResponse;

    protected function get(PropertyRequest $propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();

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
                    $storageResponse->add($returnStatus, $propertyRequest, $entityId, null);
                    return $storageResponse;
                }
            }
        }else{
            $returnStatus = 200;
        }*/

        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getStorageSetting('key', '.' . $propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                $entity = $this->data[$entityId];
                if ($key === 'basename' || $key === 'key') {
                    $content = $entityId;
                    $storageResponse->add(200, $propertyRequest, $entityId, $content);
                } else {
                    if ($key === 'content') {
                        $keyPath = [];
                    } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                        $keyPath = explode('.', substr($key, 1));
                    } else {
                        $storageResponse->add(500, $propertyRequest, $entityId, 'Incorrect storage setting key="' . $key . '".');//TODO
                        continue;
                    }
                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                    $jsonActionResponse = json_get($entity, array_merge($keyPath, $subPropertyPath));
                    if ($jsonActionResponse->succeeded()) {
                        $storageResponse->add(200, $propertyRequest, $entityId, $jsonActionResponse->content);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $storageResponse->add(404, $propertyRequest, $entityId, 'Not found');
                    }

                }
            } else {
                $storageResponse->add(404, $propertyRequest, $entityId, 'Not found');//TODO
            }
        }
        return $storageResponse;
    }

    protected function patch(PropertyRequest $propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getStorageSetting('key', '.' . $propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {

            if ($propertyRequest->getMethod() === 'POST') {
                $entityId = $this->getAutoIncrementedId($entityId);
            }

            if (!array_key_exists($entityId, $this->data)) {
                $this->data[$entityId] = [];
            }
            if ($key === "basename" || $key === "key") { //TODO or filename?
                if ($propertyRequest->getMethod() === 'POST') {
                    $content = $entityId;
                } else {
                    $content = $propertyRequest->getContent();
                }
                //TODO or extension is mixed extensions for example "json|xml"
                $content = $this->extension === '*' ? $content : basename($content, '.' . $this->extension);
                if ($content !== $entityId) {
                    $this->data[$content] = $this->data[$entityId];
                    $this->data[$entityId] = null;
                    unset($this->data[$entityId]);
                }
                $storageResponse->add(200, $propertyRequest, $content, $content);
            } else {
                if ($key === "content") {
                    $keyPath = [];
                } else if (is_string($key) && substr($key, 0, 1) === '.') {
                    $keyPath = explode('.', substr($key, 1));
                } else {
                    $storageResponse->add(500, $propertyRequest, $entityId, 'Incorrect storage setting key="' . $key . '".');//TODO
                    continue;
                }
                $content = $propertyRequest->getContent();
                $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                $jsonActionResponse = json_set($this->data[$entityId], array_merge($keyPath, $subPropertyPath), $content);
                if ($jsonActionResponse->succeeded()) {
                    //TODO update to 204
                    $storageResponse->add(200, $propertyRequest, $entityId, $jsonActionResponse->content);
                } else {
                    //TODO use $jsonActionResponse->getErrorMessage()
                    //TODO might result in 404 or 500
                    $storageResponse->add(404, $propertyRequest, $entityId, 'Not found');
                }
            }
        }
        return $storageResponse;
    }
    protected function delete(PropertyRequest $propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getStorageSetting('key', '.' . $propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                $entity =& $this->data[$entityId];
                if ($key === 'basename' || $key === 'key') {
                    $storageResponse->add(400, $propertyRequest, $entityId, 'Illegal delete request');
                } else {
                    if ($key === 'content') {
                        $storageResponse->add(400, $propertyRequest, $entityId, 'Illegal delete request');
                        continue;
                    } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                        $keyPath = explode('.', substr($key, 1));
                    } else {
                        $storageResponse->add(500, $propertyRequest, $entityId, 'Incorrect storage setting key="' . $key . '".');//TODO
                        continue;
                    }
                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1 + $property->getDepth());
                    $jsonActionResponse = json_unset($entity, array_merge($keyPath, $subPropertyPath));
                    if ($jsonActionResponse->succeeded()) {
                        //TODO update to 204
                        $storageResponse->add(200, $propertyRequest, $entityId, null);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $storageResponse->add(404, $propertyRequest, $entityId, 'Not found');
                    }

                }
            } else {
                $storageResponse->add(404, $propertyRequest, $entityId, 'Not found');//TODO
            }
        }
        return $storageResponse;
    }

    /* TODO
       abstract protected function put(PropertyRequest $propertyRequest): StorageResponse;
        abstract protected function post(PropertyRequest $propertyRequest): StorageResponse;
    */

    abstract protected function head(PropertyRequest $propertyRequest): StorageResponse;

}
