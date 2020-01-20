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

    protected function head(PropertyRequest $propertyRequest): StorageResponse
    {
        return new StorageResponse();
    }

    protected function delete(PropertyRequest $propertyRequest): StorageResponse
    {
        return new StorageResponse();
    }
}
