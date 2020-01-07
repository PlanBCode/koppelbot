<?php


/*
    storage settings
      path
      extension
      parse = json (todo xml, yaml)

    special properties
      TODO key = filename
      TODOextension = extension
      TODOmodified/created = timestamps

 */

class Storage_directory extends BasicStorage
{
    /*
    create directories if required

      parse
      path
      property

     */
    protected $path;
    protected $extension;
    protected $data;

    public function __construct(array $settings)
    {
        $this->path = array_get($settings, 'path');
        $this->extension = array_get($settings, 'extension', '*');
    }

    protected function createFilePath(string $entityId)
    {
        return $this->path . $entityId . ($this->extension != '*' ? ('.' . $this->extension) : ''); //TODO join paths properly
    }

    static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, Query $query): string
    {
        $path = array_get($settings, 'path');
        $extension = array_get($settings, 'extension', '*');
        return $path . $entityId . '.' . $extension;
    }

    protected function open(StorageRequest $storageRequest): StorageResponse
    {

        //TODO loop through property requests only if other property than id, or timestamp is requested then open the file

        $propertyRequest = $storageRequest->getFirstPropertyRequest();
        if (!$propertyRequest) {
            return new StorageResponse(500);
        }
        $entityId = $propertyRequest->getEntityId();
        if ($entityId === '*') {
            $filePaths = glob($this->createFilePath('*'));
        } else {
            $filePaths = [$this->createFilePath($entityId)];
        }
        $this->data = [];
        $parse = $propertyRequest->getProperty()->getStorageSetting('parse');
        foreach ($filePaths as $filePath) {
            $entityId = $this->extension === '*' ? $filePath : basename($filePath, '.' . $this->extension);
            //TODO lock file
            //TODO check if file exists
            $fileContent = file_get_contents($filePath);
            //TODO error if fails
            if ($parse === 'json') {
                $this->data[$entityId] = json_decode($fileContent, true);
            } else { //TODO xml,yaml,csv,tsv
                $this->data[$entityId] = $fileContent;
            }
        }
        return new StorageResponse(200);
    }

    protected function close(StorageRequest $storageRequest): StorageResponse
    {
        if (!$storageRequest->readOnly()) {
            echo 'Close ' . serialize($this->data) . PHP_EOL;
        }
        $propertyRequest = $storageRequest->getFirstPropertyRequest();
        if (!$propertyRequest) {
            return new StorageResponse(500);
        }
        $parse = $propertyRequest->getProperty()->getStorageSetting('parse');
        foreach ($this->data as $entityId => $data) {

            if (!$storageRequest->readOnly($entityId)) { //TODO dit gaat mis als de key gewijzigd wordt
                if ($parse === 'json') {
                    $fileContent = json_encode($data);
                } else {//TODO xml,yaml,csv,tsv
                    $fileContent = $data;
                }
                echo $entityId . ' ' . $fileContent . PHP_EOL;
                if ($fileContent) {
                    file_put_contents($this->createFilePath($entityId), $fileContent);
                }
            }
            //TODO unlock file
        }
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
                } elseif ($propertyRequest->getProperty()->getStorageSetting('content')) {
                    $content = $entity;
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
                    $content = $this->extension === '*' ? $content : basename($content, '.' . $this->extension);
                    $this->data[$content] = $this->data[$entityId];
                    $this->data[$entityId] = null;
                    unset($this->data[$entityId]);
                    $storageResponse->add(200, $propertyRequest, $content, $propertyName, $content);
                } elseif ($propertyRequest->getProperty()->getStorageSetting('content')) {
                    $content = $propertyRequest->getContent();
                    $this->data[$entityId] = $content;
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content);
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
