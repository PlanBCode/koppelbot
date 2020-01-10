<?php
require './lib/entities/property.php';

class Entity
{
    /** @var Property[] */
    protected $properties = []; // decoded json properties object
    protected $entityClass;

    public function __construct(string $entityClass)
    {
        $this->entityClass = $entityClass;

        //TODO check if file exists
        $fileContent = file_get_contents('./custom/datamodel/' . $entityClass . '.json'); //TODO make safe
        //TODO check if this goes well
        $properties = json_decode($fileContent, true);

        //TODO resolve inheritance
        //TODO check for primitive property
        $rootSettings = array_key_exists('_', $properties) ? $properties['_'] : [];

        foreach ($properties as $property => $settings) {
            if ($property != '_') {
                $this->properties[$property] = new Property($property, $settings, $rootSettings);
            }
        }
    }

    protected function expand(array $propertyPath, Query &$query): array
    {
        //TODO if entity is primitive them return the entities primitive property
        // return [new X($this->primitiveProperty)];
        // account for meta calls

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

    public function createStorageRequests($requestId, string $method, string $entityId, array $propertyPath, $content, Query &$query)
    {
        /** @var StorageRequest[] */
        $storageRequests = [];
        /** @var PropertyHandle[] */
        $propertyHandles = $this->expand($propertyPath, $query);
        foreach ($propertyHandles as $propertyHandle) {
            /** @var PropertyRequest */
            $propertyRequest = $propertyHandle->createPropertyRequest($requestId, $method, $this->entityClass, $entityId, $content, $query);
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
