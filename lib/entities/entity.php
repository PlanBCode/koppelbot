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

    protected function expand($propertyPath): array
    {
        //TODO if entity is primitive them return the entities primitive property
        // return [new X($this->primitiveProperty)];

        $propertyList = array_get($propertyPath, 0, '*');
        if ($propertyList === '*') {
            $propertyNames = array_keys($this->properties);
        } else {
            $propertyNames = explode(',', $propertyList);
        }

        $propertyHandles = [];
        foreach ($propertyNames as $propertyName) {
            if (!array_key_exists($propertyName, $this->properties)) {
                return [new PropertyHandle(404, 'Property "' . $propertyName . '" does not exist.', $propertyPath)]; //TODO expand error message
            } else {
                $property = $this->properties[$propertyName];
                $expandedPropertyHandles = $property->expand($propertyPath, 1);
                if (count($expandedPropertyHandles) > 0) {
                    array_push($propertyHandles, ...$expandedPropertyHandles);
                }
            }
        }
        return $propertyHandles;
    }

    public function createStorageRequests($requestId, string $method, string $entityId, array $propertyPath, $content, Query $query)
    {
        /** @var StorageRequest[] */
        $storageRequests = [];
        /** @var PropertyHandle[] */
        $propertyHandles = $this->expand($propertyPath);
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

class EntityResponse extends Response
{
    protected $entityId;

    /** @var PropertyResponse[] */
    protected $propertyResponses = [];

    public function __construct($entityId)
    {
        $this->entityId = $entityId;
    }

    public function add(int $status, string $propertyName, $content)
    {
        $this->addStatus($status);
        if (!array_key_exists($propertyName, $this->propertyResponses)) {
            $this->propertyResponses[$propertyName] = new PropertyResponse($status, $content);
        }
    }

    public function merge(EntityResponse $entityResponse)
    {
        $this->addStatus($entityResponse->getStatus());
        foreach ($entityResponse->propertyResponses as $propertyName => $propertyResponse) {
            $this->propertyResponses[$propertyName] = $propertyResponse; //TODO check for duplicate responses for propertyName ?
        }
    }

    public function getEntityId(): string
    {
        return $this->entityId;
    }

    public function getPropertyResponses(): array
    {
        return $this->propertyResponses;
    }

    public function getContent()
    {
        $content = [];
        foreach ($this->propertyResponses as $propertyName => $propertyResponse) { //TODO use a map
            if ($this->status == 207) {
                $content[$propertyName] = [
                    "status" => $propertyResponse->getStatus(),
                    "content" => $propertyResponse->getContent(),
                ];
            } else {
                $content[$propertyName] = $propertyResponse->getContent();
            }
        }
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

    public function add(int $status, string $entityId, string $propertyName, $content)
    {
        $this->addStatus($status);
        if (!array_key_exists($entityId, $this->entityResponses)) {
            $this->entityResponses[$entityId] = new EntityResponse($entityId);
        }
        $this->entityResponses[$entityId]->add($status, $propertyName, $content);
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
