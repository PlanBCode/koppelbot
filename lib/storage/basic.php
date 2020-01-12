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
            /*TODOcase 'POST':
                return $this->post($propertyRequest);
            */
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

    abstract protected function get(PropertyRequest $propertyRequest): StorageResponse;

    abstract protected function patch(PropertyRequest $propertyRequest): StorageResponse;

    /* TODO
       abstract protected function put(PropertyRequest $propertyRequest): StorageResponse;
        abstract protected function post(PropertyRequest $propertyRequest): StorageResponse;
    */

    abstract protected function head(PropertyRequest $propertyRequest): StorageResponse;

    abstract protected function delete(PropertyRequest $propertyRequest): StorageResponse;
}
