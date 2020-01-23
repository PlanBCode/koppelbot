<?php
require './engine/connectors/connectorRequest.php';
require './engine/connectors/connectorResponse.php';

//TODO autoload
require './engine/core/connectors/basic.php';
require './engine/core/connectors/file.php';
require './engine/core/connectors/directory.php';
require './engine/core/connectors/session.php';

abstract class Storage
{
    const STORAGE_STRING_META = 'META';
    const STORAGE_STRING_ERROR = 'ERROR';

    /** @var Storage[] */
    private static $storages = []; // string $storageString -> Storage

    public static function createMetaResponse(StorageRequest $storageRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            $property = $propertyRequest->getProperty();
            $storageResponse->add(200, $propertyRequest, $propertyRequest->getEntityId(), $property->getMeta());
        }
        return $storageResponse;
    }

    public static function createErrorResponse(StorageRequest $storageRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            /** @var Property */
            $property = $propertyRequest->getProperty();
            $propertyName = is_null($property) ? '*' : $property->getName();
            $storageResponse->add($propertyRequest->getStatus(), $propertyRequest, $propertyRequest->getEntityId(), $propertyRequest->getContent());
        }
        return $storageResponse;
    }

    public static function addStorage(string $type, array $storageSettings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        if ($query->checkToggle('meta')) {
            return self::STORAGE_STRING_META;
        }

        //TODO find the file and load it from there
        $storageClass = 'Storage_' . $type;
        if (!class_exists($storageClass)) {
            return self::STORAGE_STRING_ERROR;
        }

        $storageString = $type . '_' . $storageClass::getStorageString($storageSettings, $method, $entityClass, $entityId, $propertyPath, $query);

        if (!array_key_exists($storageString, self::$storages)) {
            self::$storages[$storageString] = new $storageClass($storageSettings);
        } else {
            // TODO check if the existing storage class matched the requested type
        }

        return $storageString;
    }

    public static function getStorageResponse(StorageRequest $storageRequest): StorageResponse
    {
        /** @var PropertyRequest|null $propertyRequest */
        $propertyRequest = array_get($storageRequest->getPropertyRequests(), 0);
        if (!$propertyRequest instanceof PropertyRequest) {
            return Storage::createErrorResponse($storageRequest);
        }
        $storageString = $propertyRequest->getStorageString();

        switch ($storageString) {
            case self::STORAGE_STRING_ERROR:
                return Storage::createErrorResponse($storageRequest);
            case self::STORAGE_STRING_META:
                return Storage::createMetaResponse($storageRequest);
            default:
                return Storage::$storages[$storageString]->createResponse($storageRequest);
        }
    }

    abstract static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string;

    abstract public function createResponse(StorageRequest $storageRequest): StorageResponse;
}
