<?php
require './lib/entities/property.php';

class Entity
{
    /** @var Property[] */
    protected $properties = []; // decoded json properties object
    /** @var string */
    protected $entityClass;

    public function __construct(string $entityClass)
    {
        $this->entityClass = $entityClass;
        $fileName = './custom/datamodel/' . $entityClass . '.json'; // TODO or lib/datamodel
        if (file_exists($fileName)) {
            $fileContent = file_get_contents($fileName); //TODO make safe
            //TODO check if this goes well
            $properties = json_decode($fileContent, true);

            //TODO maybe resolve inheritance
            $rootSettings = array_key_exists('_', $properties) ? $properties['_'] : [];

            foreach ($properties as $property => $settings) {
                if ($property != '_') {
                    $this->properties[$property] = new Property($property, $settings, $rootSettings);
                }
            }
        } else {
            //TODO error
        }
    }

    protected function expand(array $propertyPath, Query &$query): array
    {
        // TODO account for meta calls

        /** @var string */
        $propertyList = array_get($propertyPath, 0, '*');
        if ($propertyList === '*') {
            $propertyNames = array_keys($this->properties);
        } else {
            $propertyNames = explode(',', $propertyList);
        }
        $propertyHandles = [];
        foreach ($propertyNames as $propertyName) {
            $propertyPathSingular = $propertyPath;
            $propertyPathSingular[0] = $propertyName;
            if (!array_key_exists($propertyName, $this->properties)) {
                //TODO expand error message using $propertyPathSingular
                $propertyHandle = new PropertyHandle(404, 'Property "' . $propertyName . '" does not exist.', $propertyPathSingular);
                array_push($propertyHandles, $propertyHandle);
            } else {
                $property = $this->properties[$propertyName];
                $expandedPropertyHandles = $property->expand($propertyPathSingular, 1, $query);
                if (count($expandedPropertyHandles) > 0) {
                    array_push($propertyHandles, ...$expandedPropertyHandles);
                }
            }
        }
        return $propertyHandles;
    }

    protected function createPropertyRequests($requestId, string $method, string $entityIdList, array $propertyPath, $entityClassContent, Query &$query): array
    {
        /** @var string[] */
        $entityIds = [];
        if ($entityIdList === '*') {
            $entityIds = ['*'];// TODO retrieve all ids
        } else {
            $entityIds = explode(',', $entityIdList);
        }

        if ($method === 'PUT' && ($entityIdList === '*' || count($propertyPath) > 0)) {
            /** @var PropertyHandle[] */
            $propertyHandles = [new PropertyHandle(400, 'PUT method expects uri of the form /' . $this->entityClass . '/$ID', [$this->entityClass])];
            /*        } elseif ($method === 'POST' && ($entityIdList !== '*' || count($propertyPath) > 0)) {
                        $propertyHandles = [new PropertyHandle(400, 'POST method expects uri of the form /'.$this->entityClass.'', [$this->entityClass])];*/
        } else {
            /** @var PropertyHandle[] */
            $propertyHandles = $this->expand($propertyPath, $query);
        }
        /** @var PropertyRequest[] */
        $propertyRequests = [];
        /** @var PropertyRequest[] */
        $errorPropertyRequests = [];

        foreach ($entityIds as $entityId) {
            if (is_array($entityClassContent)) {
                $entityIdContent = array_null_get($entityClassContent, $entityId);
            } else {
                $entityIdContent = null;
            }

            if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
                foreach ($this->properties as $propertyName => $property) {
                    $propertyContent = array_null_get($entityIdContent, $propertyName);
                    if (!is_null($propertyContent)) {
                        if (!$property->validate($propertyContent)) {
                            $error = 'Invalid content for /' . $this->entityClass . '/' . $entityId . '/' . $propertyName;
                            $path = [$this->entityClass, $entityId, $propertyName];
                            $errorPropertyRequest = new PropertyRequest(400, $requestId, $method, $this->entityClass, $entityId, $error, $path, $propertyContent, $query);
                            $errorPropertyRequests[] = $errorPropertyRequest;
                        }
                    } elseif (($method === 'PUT' || $method === 'POST') && $property->isRequired()) {
                        $error = 'Missing content for required /' . $this->entityClass . '/' . $entityId . '/' . $propertyName;
                        $path = [$this->entityClass, $entityId, $propertyName];
                        $errorPropertyRequest = new PropertyRequest(400, $requestId, $method, $this->entityClass, $entityId, $error, $path, $propertyContent, $query);
                        $errorPropertyRequests[] = $errorPropertyRequest;
                    }
                }
            }

            foreach ($propertyHandles as $propertyHandle) {
                $propertyRequests[] = $propertyHandle->createPropertyRequest($requestId, $method, $this->entityClass, $entityId, $entityIdContent, $query);
            }
        }
        if (!empty($errorPropertyRequests)) {
            return $errorPropertyRequests;
        }
        return $propertyRequests;
    }

    public function createStorageRequests($requestId, string $method, string $entityIdList, array $propertyPath, $entityClassContent, Query &$query)
    {
        /** @var PropertyRequest[] */
        $propertyRequests = $this->createPropertyRequests($requestId, $method, $entityIdList, $propertyPath, $entityClassContent, $query);

        //TODO only when adding new : check if entity exists
        //TODO check if required properties are handled


        /** @var StorageRequest[] */
        $storageRequests = [];
        foreach ($propertyRequests as $propertyRequest) {
            $storageString = $propertyRequest->getStorageString();
            if (!array_key_exists($storageString, $storageRequests)) {
                $storageRequests[$storageString] = new StorageRequest();
            }
            $storageRequests[$storageString]->add($propertyRequest);
        }
        return $storageRequests;
    }
}

function cleanWrapping(array &$wrapper, int $status)
{
    if ($status === 207) {
        foreach ($wrapper as $subPropertyName => &$subWrapper) {
            if (array_key_exists('content2', $subWrapper)) {
                $subWrapper['content'] = $subWrapper['content2'];
                unset($subWrapper['content2']); //TODO more efficient
            } else {
                $subContent =& $subWrapper['content'];
                $subStatus = $subWrapper['status'];
                cleanWrapping($subContent, $subStatus);
            }
        }
    } else {
        foreach ($wrapper as $subPropertyName => &$subWrapper) {
            $subStatus = $subWrapper['status']; // TODO Should match with $status;
            if (array_key_exists('content2', $subWrapper)) {
                $wrapper[$subPropertyName] = $subWrapper['content2'];
            } else {
                $wrapper[$subPropertyName] = $subWrapper['content'];
                cleanWrapping($subWrapper, $subStatus);
            }
        }
    }
}

class EntityResponse extends Response
{
    protected $entityId;

    /** @var PropertyResponse[] */
    protected $propertyResponses = [];

    public function __construct($entityId)
    {
        $this->entityId = $entityId;
    }

    public function add(int $status, array $propertyPath, $content)
    {
        $this->addStatus($status);
        $this->propertyResponses[] = new PropertyResponse($status, $propertyPath, $content);
    }

    public function merge(EntityResponse $entityResponse)
    {
        $this->addStatus($entityResponse->getStatus());
        foreach ($entityResponse->propertyResponses as $propertyResponse) {
            $this->propertyResponses[] = $propertyResponse; //TODO check for duplicate responses for propertyName ?
        }
    }

    public function getEntityId(): string
    {
        return $this->entityId;
    }

    public function getContent()
    {
        $content = [];
        foreach ($this->propertyResponses as $propertyResponse) {
            $propertyPath = $propertyResponse->getPropertyPath();
            $wrapperIterator =& $content;
            foreach ($propertyPath as $depth => $subPropertyName) {
                $subStatus = $propertyResponse->getStatus();
                if ($depth === count($propertyPath) - 1) {
                    $subContent = $propertyResponse->getContent();
                    $wrapperIterator[$subPropertyName] = ["status" => $subStatus, "content2" => $subContent];
                } else {
                    if (!array_key_exists($subPropertyName, $wrapperIterator)) {
                        $wrapperIterator[$subPropertyName] = ["status" => $subStatus, "content" => []];
                        $wrapperIterator =& $wrapperIterator[$subPropertyName]['content'];
                    } else {
                        $currentStatus = $wrapperIterator[$subPropertyName]['status'];
                        if ($subStatus !== $currentStatus) {
                            $wrapperIterator[$subPropertyName]['status'] = 207;
                        }
                        $wrapperIterator =& $wrapperIterator[$subPropertyName]['content'];
                    }
                }
            }
        }
        cleanWrapping($content, $this->getStatus());

        return $content;
    }
}

class EntityClassResponse extends Response
{
    protected $entityClass;

    /** @var EntityResponse[] */
    protected $entityResponses = [];

    public function __construct($entityClass)
    {
        $this->entityClass = $entityClass;
    }

    public function add(int $status, string $entityId, array $propertyPath, $content)
    {
        $this->addStatus($status);
        if (!array_key_exists($entityId, $this->entityResponses)) {
            $this->entityResponses[$entityId] = new EntityResponse($entityId);
        }
        $this->entityResponses[$entityId]->add($status, $propertyPath, $content);
    }

    public function merge(EntityClassResponse $entityClassResponse)
    {
        $this->addStatus($entityClassResponse->getStatus());
        foreach ($entityClassResponse->entityResponses as $entityId => $entityResponse) {
            if (!array_key_exists($entityId, $this->entityResponses)) {
                $this->entityResponses[$entityId] = $entityResponse;
            } else {
                $this->entityResponses[$entityId]->merge($entityResponse);
            }
        }
    }

    public function getEntityClass(): string
    {
        return $this->entityClass;
    }

    public function getEntityResponses(): array
    {
        return $this->entityResponses;
    }

    public function getContent()
    {
        $content = [];
        foreach ($this->entityResponses as $entityId => $entityResponse) { //TODO use a map
            if ($this->status == 207) {
                $content[$entityId] = [
                    "status" => $entityResponse->getStatus(),
                    "content" => $entityResponse->getContent(),
                ];
            } else {
                $content[$entityId] = $entityResponse->getContent();
            }
        }

        return $content;
    }
}
