<?php
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
    const STORAGE_STRING_ERROR = 'ERROR';

    /** @var Storage[] */
    private static $storages = []; // string $storageString -> Storage

    public static function createErrorResponse(StorageRequest $storageRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            $propertyName = $propertyRequest->getProperty();
            $storageResponse->add(404, $propertyRequest, $propertyRequest->getEntityId(), 'error', 'Property ' . $propertyName . ' not found for ' . $propertyRequest->getEntityClass());//TODO
        }

        return $storageResponse;
    }

    public static function addStorage(string $type, array $storageSettings)
    {
        $storageClass = 'Storage_' . $type;
        if (!class_exists($storageClass)) {
            return null;
        }

        $storageString = $type . '_' . $storageClass::getStorageString($storageSettings);
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
        $storageString = $propertyRequest->getProperty()->getStorageString();

        return $storageString != self::STORAGE_STRING_ERROR ? Storage::$storages[$storageString]->createResponse($storageRequest) : Storage::createErrorResponse($storageRequest);
    }

    abstract static protected function getStorageString(array $settings/*, $method, $entityClass, $entityId, $content, $query*/): string;//TODO

    abstract public function createResponse(StorageRequest $storageRequest): StorageResponse;
}

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
            case 'PUT':
                return $this->put($propertyRequest);
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

    abstract protected function put(PropertyRequest $propertyRequest): StorageResponse;

    abstract protected function head(PropertyRequest $propertyRequest): StorageResponse;

    abstract protected function delete(PropertyRequest $propertyRequest): StorageResponse;
}

class Storage_file extends BasicStorage
{ //TODO in separate file, separate folder (not lib)
    /*
    create directories if required

      parse
      path
      property

     */
    protected $path;
    protected $data;

    public function __construct(array $settings)
    {
        $this->path = array_get($settings, 'path');
    }

    static protected function getStorageString(array $settings/*, $method, $entityClass, $entityId, $content, $query*/): string
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
        $entityIds = $entityIdList == '*' ? array_keys($this->data) : explode(',', $entityIdList);

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
        $entityIds = $entityIdList == '*' ? array_keys($this->data) : explode(',', $entityIdList);

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

/*

  TODO

class Storage_multifile extends Storage
class Storage_directory extends Storage



class MySqlStorage extends Storage {
 credentials?
 create db's tables  if required

      db
      table
      index
      property = column

    public function __construct($json){

    }

 */
