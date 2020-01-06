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

    protected function getPropertiesFromPropertyName($propertyName): array
    {
        if ($propertyName == '*') {
            $properties = $this->properties;
        } else {
            $properties = [];
            foreach (explode(',', $propertyName) as $p) {
                if (array_key_exists($p, $this->properties)) {
                    $properties[$p] = $this->properties[$p];
                } else {
                    $properties[$p] = $p;
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

    public function getUiComponentHtml(string $action, string $entityId, string $propertyName, Query $query): string
    {
        $html = '';
        $query = new Query('');
        // TODO method based on action new/delete -> 'HEAD'
        $storageRequests = $this->createStorageRequests(null, 'GET', $entityId, $propertyName, null, $query);
        if ($action === 'list') {
            $html .= '<table class="list">';
            $html .= '<tr class="list-header">';
            $properties = $this->getPropertiesFromPropertyName($propertyName);
            $html .= '<td></td>'; //TODO select all

            foreach ($properties as $propertyName => $property) {
                $html .= '<td>' . $propertyName . '</td>';
            }
            $html .= '</tr>';
        }
        foreach ($storageRequests as $storageRequest) {

            $storageResponse = Storage::getStorageResponse($storageRequest);

            foreach ($storageResponse->getRequestResponses() as $requestResponse) {
                //TODO catch errors
                foreach ($requestResponse->getEntityClassResponses() as $entityClassResponse) {
                    //TODO catch errors
                    foreach ($entityClassResponse->getEntityResponses() as $entityResponse) {
                        //TODO catch errors
                        $entityId = $entityResponse->getEntityId();
                        if ($action === 'list') {
                            $html .= '<tr class="list-item" onclick="xyz.eventDrillDown(event,\''.$entityId.'\')">';
                            $html .= '<td><input type="' . ($query->checkToggle('multi-select') ?  'checkbox':'radio') . '" name="TODO"></td>';//TODO choose name
                        } else {
                            $html .= '<div>';
                            $html .= '<div class="item-header">' . $entityId. '</div>';
                        }
                        foreach ($entityResponse->getPropertyResponses() as $propertyName => $propertyResponse) {
                            //TODO catch errors
                            $property = $this->properties[$propertyName];
                            $content = $propertyResponse->getContent();
                            if ($action === 'list') {
                                $html .= '<td>';
                            }
                            if (!$query->checkToggle('no_label') && $action !== 'list') {
                                //TODO pass or generate and use id
                                $html .= '<label for="TODO">' . $propertyName . '</label>';
                            }
                            $html .= $property->getUiComponentHtml($action, $entityId, $content, $query);
                            if ($action === 'list') {
                                $html .= '</td>';
                            }
                        }
                        if ($action === 'list') {
                            $html .= '</tr>';
                        } else {
                            $html .= '</div>';
                        }
                    }
                }
            }
        }
        if ($action === 'list') {
            $html .= '</table>';
        }
        return $html;
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
