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

        $rootSettings = array_key_exists('_', $properties) ? $properties['_'] : [];

        foreach ($properties as $property => $settings) {
            if ($property != '_') {
                $this->properties[$property] = new Property($property, $settings, $rootSettings);
            }
        }
    }

    protected function getPropertiesFromPropertyName($propertyNames): array
    {
        $properties = [];
        if ($propertyNames === '*') {
            foreach ($this->properties as $propertyName => $property) {
                if (!$property->isCombined()) {
                    $properties[$propertyName] = $property;
                }
            }
        } else {
            foreach (explode(',', $propertyNames) as $propertyName) {
                $property = array_get($this->properties, $propertyName);
                if ($property) {
                    $combinedProperties = $property->getCombinedProperties();
                    if ($combinedProperties) {
                        foreach ($combinedProperties as $label=>$propertyName) {
                            $properties[$propertyName] = array_get($this->properties, $propertyName, $propertyName);
                        }
                    } else {
                        $properties[$propertyName] = $property;
                    }
                } else {
                    $properties[$propertyName] = $propertyName;
                }
            }
        }
        return $properties;
    }

    public function createStorageRequests($requestId, string $method, string $entityId, string $propertyName, $content, Query $query)
    {
        $storageRequests = [];
        $properties = $this->getPropertiesFromPropertyName($propertyName);

        /** @var Property|string $property */
        foreach ($properties as $propertyName => $property) {
            $propertyRequest = new PropertyRequest($requestId, $method, $this->entityClass, $entityId, $property, $content, $query);
            $storageString = is_string($property) ? Storage::STORAGE_STRING_ERROR : $propertyRequest->getStorageString();
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
