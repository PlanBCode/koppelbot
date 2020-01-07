<?php

require './lib/storage/basic.php';
require './lib/storage/file.php';
require './lib/storage/directory.php';

/*

  if for multiple properties storage json is the same except for property then offer them merged to Storage

 */

class StorageRequest
{
    /** @var PropertyRequest[] */
    protected $propertyRequests = [];

    public function add($propertyRequest): void
    {
        $this->propertyRequests[] = $propertyRequest;
    }

    public function merge($storageRequest): void
    {
        array_push($this->propertyRequests, ...$storageRequest->propertyRequests);
    }

    public function getPropertyRequests(): array
    {
        return $this->propertyRequests;
    }

    public function getFirstPropertyRequest(): PropertyRequest
    {
        return reset($this->propertyRequests);
    }

    public function readOnly(string $entityId = ''): bool
    {
        foreach ($this->propertyRequests as $propertyRequest) {
            if (($entityId === '' || $entityId === $propertyRequest->getEntityId()) && !$propertyRequest->readOnly()) {
                return false;
            }
        }
        return true;
    }
}

class StorageResponse extends Response
{
    /** @var RequestResponse[] */
    protected $requestResponses = [];

    public function __construct(int $status = 200)
    {
        $this->addStatus($status);
    }

    public function add(int $status, PropertyRequest $propertyRequest, string $entityId, string $propertyName, $content): void
    {
        $this->addStatus($status);
        $requestId = $propertyRequest->getRequestId();
        if (!array_key_exists($requestId, $this->requestResponses)) {
            $this->requestResponses[$requestId] = new RequestResponse($requestId);
        }
        $this->requestResponses[$requestId]->add($status, $propertyRequest->getEntityClass(), $entityId, $propertyName, $content);
    }

    public function merge(StorageResponse $storageResponse): void
    {
        $this->addStatus($storageResponse->getStatus());
        foreach ($storageResponse->requestResponses as $requestId => $requestResponse) {
            if (!array_key_exists($requestId, $this->requestResponses)) {
                $this->requestResponses[$requestId] = $requestResponse;
            } else {
                $this->requestResponses[$requestId]->merge($requestResponse);
            }
        }
    }

    public function getRequestResponses(): array
    {
        return $this->requestResponses;
    }
}

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
            $storageResponse->add(200, $propertyRequest, $propertyRequest->getEntityId(), $property->getName(), $property->getMeta());
        }
        return $storageResponse;
    }

    public static function createErrorResponse(StorageRequest $storageRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            $property = $propertyRequest->getProperty();
            $propertyName = is_string($property) ? $property : $property->getName();
            $storageResponse->add($propertyRequest->getStatus(), $propertyRequest, $propertyRequest->getEntityId(), $propertyName, $propertyRequest->getContent());
        }
        return $storageResponse;
    }

    public static function addStorage(string $type, array $storageSettings, string $method, string $entityClass, string $entityId, Query $query)
    {
        if ($query->checkToggle('meta')) {
            return self::STORAGE_STRING_META;
        }

        $storageClass = 'Storage_' . $type;
        if (!class_exists($storageClass)) {
            return null;
        }

        $storageString = $type . '_' . $storageClass::getStorageString($storageSettings, $method, $entityClass, $entityId, $query);

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

    abstract static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, Query $query): string;

    abstract public function createResponse(StorageRequest $storageRequest): StorageResponse;
}
