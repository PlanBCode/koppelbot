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
        if (!file_exists($this->path)) {// TODO pass an error message?
            if ($storageRequest->readOnly()) {
                return new StorageResponse(404);
            } else { // create the file
                $this->data = [];
            }
        } else {
            $parse = $storageRequest->getFirstPropertyRequest()->getProperty()->getStorageSetting('parse');
            //TODO lock file
            $fileContent = file_get_contents($this->path);
            if ($parse === 'json') {
                //TODO error if parsing fails
                $this->data = json_decode($fileContent, true);
            } else { //TODO xml, yaml,csv,tsv
                return new StorageResponse(500);
            }
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

    //TODO refactor with file.php into basic.php
    protected function get(PropertyRequest $propertyRequest): StorageResponse
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
                $entity = $this->data[$entityId];
                if ($key === 'key') {
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

                    $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1);
                    $jsonActionResponse = json_get($entity, array_merge($keyPath, $subPropertyPath));
                    if ($jsonActionResponse->succeeded()) {
                        $storageResponse->add(200, $propertyRequest, $entityId, $jsonActionResponse->content);
                    } else {
                        //TODO use $jsonActionResponse->getErrorMessage()
                        //TODO might result in 404 or 500
                        $error = '/' . $propertyRequest->getEntityClass() . '/' . $entityId . '/' . implode('/', $propertyRequest->getPropertyPath()) . ' not found.';
                        $storageResponse->add(404, $propertyRequest, $entityId, $error);
                    }
                }
            } else {
                $storageResponse->add(404, $propertyRequest, $entityId, '/' . $propertyRequest->getEntityClass() . '/' . $entityId . '/* not found.');
            }
        }
        return $storageResponse;
    }

    //TODO refactor with file.php into basic.php
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
            if (!array_key_exists($entityId, $this->data)) {
                $this->data[$entityId] = [];
            }
            $content = $propertyRequest->getContent();
            if ($key === 'key') {
                $this->data[$content] = $this->data[$entityId];
                unset($this->data[$entityId]);
            } else {
                if ($key === 'content') {
                    $keyPath = [];
                } elseif (is_string($key) && substr($key, 0, 1) === '.') {
                    $keyPath = explode('.', substr($key, 1));
                } else {
                    $storageResponse->add(500, $propertyRequest, $entityId, 'Incorrect storage setting key="' . $key . '".');//TODO
                    continue;
                }

                $content = $propertyRequest->getContent();
                $subPropertyPath = array_slice($propertyRequest->getPropertyPath(), 1);
                $jsonActionResponse = json_set($this->data[$entityId], array_merge($keyPath, $subPropertyPath), $content);
                if ($jsonActionResponse->succeeded()) {
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

    protected function head(PropertyRequest $propertyRequest): StorageResponse
    {
        return new StorageResponse();
    }

    protected function delete(PropertyRequest $propertyRequest): StorageResponse
    {
        return new StorageResponse();
    }
}
