<?php

/*
    general storage settings
      path        "/path/to/directory/"
      extension    "json"|"*"
      parse "json" (todo xml, yaml)

    property storage settings:
      key: "content"
      key: "basename"
      key: "filename"
      key: "extension"
      key: "content.a.b"
   TODO modified/created = timestamps
 */

class Storage_directory extends BasicStorage
{
    /*
    create directories if required

     */
    protected $path;
    protected $extension;
    protected $data;
    protected $settings;

    protected $maxAutoIncrementedId;
    protected $autoIncrementLookup = [];

    public function __construct(array &$settings)
    {
        $this->path = array_get($settings, 'path');
        $this->extension = array_get($settings, 'extension', '*');
        $this->settings = $settings;
    }

    protected function createFilePath(string $entityId)
    {
        return $this->path . $entityId . ($this->extension != '*' ? ('.' . $this->extension) : ''); //TODO join paths properly
    }

    static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        $path = array_get($settings, 'path');
        $extension = array_get($settings, 'extension', '*');
        return $path . '*.' . $extension;
    }

    protected function getAllEntityIds(): array
    {
        $entityIds = [];
        foreach (glob($this->createFilePath('*')) as $filePath) {
            $entityIds[] = $this->extension === '*' ? basename($filePath) : basename($filePath, '.' . $this->extension);
        }
        return $entityIds;
    }

    protected function getAutoIncrementedId(string $entityId): string
    {
        if (array_key_exists($entityId, $this->autoIncrementLookup)) {
            return $this->autoIncrementLookup[$entityId];
        }
        if (empty($this->autoIncrementLookup)) {
            //TODO error if extension === '*'  no way to decide then
            $allExistingEntityIds = $this->getAllEntityIds();
            if (empty($allExistingEntityIds)) {
                $this->maxAutoIncrementedId = 0;
            } else {
                $integerEntityIds = array_map('intval', $allExistingEntityIds);
                $this->maxAutoIncrementedId = max($integerEntityIds) + 1;
            }
        } else {
            $this->maxAutoIncrementedId++;
        }
        $max = strval($this->maxAutoIncrementedId);
        $this->autoIncrementLookup[$entityId] = $max;
        return $max;
    }

    protected function open(StorageRequest $storageRequest): StorageResponse
    {
        //TODO loop through property requests only if other property than id, or timestamp is requested then open the file
        $propertyRequest = $storageRequest->getFirstPropertyRequest();

        $entityIds = [];
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            $entityIdList = $propertyRequest->getEntityId();
            if ($entityIdList === '*') {
                $entityIds = $this->getAllEntityIds();
                break;
            } else {
                array_push($entityIds, ...explode(',', $entityIdList));
                $entityIds = array_unique($entityIds);
            }
        }

        $this->data = [];
        $parse = $propertyRequest->getProperty()->getStorageSetting('parse', 'none');
        foreach ($entityIds as $entityId) {
            $filePath = $this->createFilePath($entityId);

            //TODO lock file
            if (!file_exists($filePath)) {// TODO pass an error message?
                return new StorageResponse(404);
            }
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

        $propertyRequest = $storageRequest->getFirstPropertyRequest();

        if (!$propertyRequest) {
            return new StorageResponse(500);
        }
        $parse = $propertyRequest->getProperty()->getStorageSetting('parse', 'none');

        foreach ($this->data as $entityId => $data) {
            if (!$storageRequest->readOnly($entityId) || !is_null($this->maxAutoIncrementedId)) {
                if ($parse === 'json') {
                    $fileContent = json_encode($data);
                } else {//TODO xml,yaml,csv,tsv
                    $fileContent = $data;
                }
                if ($fileContent) {
                    file_put_contents($this->createFilePath($entityId), $fileContent);
                }
            }
            //TODO unlock file
        }
        return new StorageResponse(200);
    }

    protected function head(PropertyRequest $propertyRequest): StorageResponse
    {
        //TODO
        return new StorageResponse();
    }

    protected function delete(PropertyRequest $propertyRequest): StorageResponse
    {
        //TODO
        return new StorageResponse();
    }
}