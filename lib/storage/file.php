<?php

/*
    storage settings
      path
      parse json (todo xml, yaml)

    special properties
      key

 */

class Storage_file extends BasicStorage
{
    //TODO create directories if required


    protected $path;
    protected $data;

    public function __construct(array $settings)
    {
        $this->path = array_get($settings, 'path');
    }

    static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, Query $query): string
    {
        return array_get($settings, 'path');
    }

    protected function open(StorageRequest $storageRequest): StorageResponse
    {
        //TODO lock file
        //TODO check if file exists
        $fileContent = file_get_contents($this->path);
        //TODO error if fails
        $this->data = json_decode($fileContent, true);

        return new StorageResponse(200);
    }

    protected function close(StorageRequest $storageRequest): StorageResponse
    {
        $fileContent = json_encode($this->data);
        if ($fileContent) {
            file_put_contents($this->path, $fileContent);//TODO only on write
        }

        //TODO unlock file
        return new StorageResponse(200);
    }

    protected function get(PropertyRequest $propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                $entity = $this->data[$entityId];
                $property = $propertyRequest->getProperty();
                $propertyName = $property->getName();
                if ($propertyRequest->getProperty()->getStorageSetting('key')) {
                    $content = $entityId;
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content);
                } elseif (array_key_exists($propertyName, $entity)) {
                    $content = $entity[$propertyName];
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content);
                } else {
                    $storageResponse->add(404, $propertyRequest, $entityId, $propertyName, 'Not found');//TODO pass something
                }
            } else {
                $storageResponse->add(404, $propertyRequest, $entityId, '*', 'Not found');//TODO
            }
        }

        return $storageResponse;
    }

    protected function put(PropertyRequest $propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                $entity = $this->data[$entityId];
                $property = $propertyRequest->getProperty();
                $propertyName = $property->getName();
                if ($propertyRequest->getProperty()->getStorageSetting('key')) {
                    $content = $propertyRequest->getContent();
                    $this->data[$content] = $this->data[$entityId];
                    unset($this->data[$entityId]);
                } elseif (array_key_exists($propertyName, $entity)) {
                    $content = $propertyRequest->getContent();
                    $this->data[$entityId][$propertyName] = $content;
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content);
                } else {
                    $storageResponse->add(404, $propertyRequest, $entityId, $propertyName, 'Not found');//TODO pass something
                }
            } else {
                $storageResponse->add(404, $propertyRequest, $entityId, '*', 'Not found');//TODO
            }
        }

        return $storageResponse;
    }

    protected function head(PropertyRequest $propertyRequest): StorageResponse
    {
        return new StorageResponse();
    }

    protected function delete(PropertyRequest $propertyRequest): StorageResponse
    {
        return new StorageResponse();
    }
}
