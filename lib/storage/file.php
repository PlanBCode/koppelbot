<?php

/*
    general storage settings
      path   "/path/to/basename.extension"
      parse "json" (todo xml, yaml)

    property storage settings:
      key: "content"
      key: "key"
      key: "content.a.b"
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

    static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        return array_get($settings, 'path');
    }

    protected function open(StorageRequest $storageRequest): StorageResponse
    {
        //TODO lock file
        if (!file_exists($this->path)) {// TODO pass an error message?
            return new StorageResponse(404);
        }

        $fileContent = file_get_contents($this->path);

        $parse = $storageRequest->getFirstPropertyRequest()->getProperty()->getStorageSetting('parse');

        //TODO error if fails
        if ($parse === 'json') {
            $this->data = json_decode($fileContent, true);
        } else { //TODO xml, yaml,csv,tsv
            return new StorageResponse(500);
        }

        return new StorageResponse(200);
    }

    protected function close(StorageRequest $storageRequest): StorageResponse
    {
        if (!$storageRequest->readOnly()) {
            $parse = $storageRequest->getFirstPropertyRequest()->getProperty()->getStorageSetting('parse');
            if ($parse === 'json') {
                $fileContent = json_encode($this->data);
            } else { //TODO xml, yaml,csv,tsv
                return new StorageResponse(500);
            }

            if ($fileContent) {
                file_put_contents($this->path, $fileContent);
            }
        }
        //TODO unlock file
        return new StorageResponse(200);
    }

    protected function get(PropertyRequest $propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList === '*' ? array_keys($this->data) : explode(',', $entityIdList);

        $property = $propertyRequest->getProperty();
        $propertyName = $property->getName();
        $key = $propertyRequest->getProperty()->getStorageSetting('key','.'.$propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (array_key_exists($entityId, $this->data)) {
                $entity = $this->data[$entityId];
                if ($key === 'key') {
                    $content = $entityId;
                    $storageResponse->add(200, $propertyRequest, $entityId, $content);
                } else if ($key === 'content') {
                    $content = $entity;
                    $storageResponse->add(200, $propertyRequest, $entityId, $content);
                } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                    $keyPath = explode('.', substr($key,1));
                    if (array_key_exists($keyPath[0], $entity)) {//TODO multi keypath
                        $content = $entity[$keyPath[0]];
                        $storageResponse->add(200, $propertyRequest, $entityId, $content);
                    } else {
                        $error = '/' . $propertyRequest->getEntityClass() . '/' . $entityId . '/' . implode('/', $propertyRequest->getPropertyPath()) . ' not found.';
                        $storageResponse->add(404, $propertyRequest, $entityId, $error);
                    }
                } else {
                    $storageResponse->add(500, $propertyRequest, $entityId, 'Incorrect storage setting key="' . $key . '".');//TODO
                }
            } else {
                $storageResponse->add(404, $propertyRequest, $entityId, '/' . $propertyRequest->getEntityClass() . '/' . $entityId . '/* not found.');
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
        $key = $propertyRequest->getProperty()->getStorageSetting('key','.'.$propertyName);

        //Loop through entityIds and add properties
        foreach ($entityIds as $entityId) {
            if (!array_key_exists($entityId, $this->data)) {
                $this->data[$entityId] = [];
            }
            $content = $propertyRequest->getContent();
            if ($key === 'key') {
                $this->data[$content] = $this->data[$entityId];
                unset($this->data[$entityId]);
            } elseif ($key === 'content') {
                $this->data[$entityId] = $content;
            } elseif (is_string($key) && substr($key, 1) === '.') {
                $keyPath = explode('.', substr($key,0,-1));
                $this->data[$keyPath[0]] = $content;//TODO multi key path
            } else {
                $storageResponse->add(500, $propertyRequest, $entityId, 'Incorrect storage setting key="' . $key . '".');//TODO
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
