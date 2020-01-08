<?php
require './lib/types/type.php';

function getMergedSetting($name, $settings, $rootSettings)
{
    if (array_key_exists($name, $settings)) {
        return $settings[$name];
    } elseif (array_key_exists($name, $rootSettings)) {
        return $rootSettings[$name];
    } else {
        return null;
    }
}

function getSingleSetting($name, $settings, $rootSettings)
{
    if (array_key_exists($name, $settings) && array_key_exists($name, $rootSettings)) {
        return array_merge($rootSettings[$name], $settings[$name]);
    } elseif (array_key_exists($name, $settings)) {
        return $settings[$name];
    } elseif (array_key_exists($name, $rootSettings)) {
        return $rootSettings[$name];
    } else {
        return [];
    }
}

class  PropertyRequest
{
    protected $requestId;

    protected $method;
    protected $entityClass;
    protected $entityId;
    /** @var Property */
    protected $property;
    /** @var mixed */
    protected $content;
    protected $query;

    protected $status;

    protected $storageString;

    public function __construct($requestId, string $method, string $entityClass, string $entityId, $property, $content, Query $query)
    {
        $this->requestId = $requestId;
        $this->method = $method;
        $this->entityId = $entityId;
        $this->entityClass = $entityClass;
        $this->property = $property;
        $this->content = $content;
        $this->query = $query;
        if (is_string($property)) { //TODO perhaps a nicer way of handling errors
            $this->status = 404;
            $this->storageString = Storage::STORAGE_STRING_ERROR;
            $this->content = 'Property ' . $property . ' not found for ' . $entityClass . '.';
        } elseif ($method === 'PUT' && !$property->validate($content)) {
            $this->status = 400;
            $this->storageString = Storage::STORAGE_STRING_ERROR;
            $this->content = 'Invalid content for /' . $entityClass . '/' . $entityId . '/' . $property . '.';
        } else {
            $this->status = 200;
            $storageSettings = $this->property->getStorageSettings();
            $storageType = array_get($storageSettings, 'type');
            $this->storageString = Storage::addStorage($storageType, $storageSettings, $method, $entityClass, $entityId, $query);
            if ($this->storageString === null) {
                $this->status = 500;
                $this->content = 'Storage failure for /' . $entityClass . '/' . $entityId . '/' . $property . '.';
                $this->storageString = Storage::STORAGE_STRING_ERROR;
            }
        }
    }

    public function readOnly(): bool
    {
        return $this->method !== 'PUT' && $this->method !== 'DELETE';
    }

    public function getStatus()
    {
        return $this->status;
    }

    public function getRequestId()
    {
        return $this->requestId;
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getEntityId(): string
    {
        return $this->entityId;
    }

    public function getEntityClass(): string
    {
        return $this->entityClass;
    }

    public function getProperty(): Property
    {
        return $this->property;
    }

    public function getContent()
    {
        return $this->content;
    }

    public function getQuery(): Query
    {
        return $this->query;
    }

    public function getStorageString()
    {
        return $this->storageString;
    }
}

class PropertyResponse extends Response
{
    protected $content;

    public function __construct(int $status, $content = null)
    {
        $this->addStatus($status);
        $this->content = $content;
    }

    public function getContent()
    {
        return $this->content;
    }
}

class Property
{
    const PROPERTY_TYPE = 'type';
    const PROPERTY_STORAGE = 'storage';
    const PROPERTY_ACCESS = 'access';

    protected $propertyName;

    protected $type;
    protected $settings;

    protected $storage;
    protected $access;

    protected $subProperties;
    /* TODO
       required
      audit
      default*/

    public function __construct(string $propertyName, $settings, $rootSettings)
    {
        $this->propertyName = $propertyName;
        $this->settings = $settings;

        $typeName = getSingleSetting(self::PROPERTY_TYPE, $settings, $rootSettings);

        $this->storage = getMergedSetting(self::PROPERTY_STORAGE, $settings, $rootSettings);
        $this->access = getMergedSetting(self::PROPERTY_ACCESS, $settings, $rootSettings);

        $settingStorage = array_get($settings, self::PROPERTY_STORAGE, []);
        $rootSettingStorage = array_get($rootSettings, self::PROPERTY_STORAGE, []);
        $this->storage = array_merge($rootSettingStorage, $settingStorage);

        $typeClass = 'Type_' . $typeName;
        //TODO error if file does not exist
        require_once './lib/types/' . $typeName . '.php';

        if (!class_exists($typeClass)) {
            //return null; //TODO ERROR
        }
        $this->type = new $typeClass();
    }

    public function getCombinedProperties(): array
    {
        return array_get($this->settings, 'combined');
    }

    public function getName(): string
    {
        return $this->propertyName;
    }

    public function getStorageSettings(): array
    {
        return $this->storage;
    }

    public function getMeta(): array
    {
        return $this->settings;
    }

    public function validate($content): bool
    {
        return $this->type->validate($content, $this->settings);
    }

    public function getStorageSetting($settingName)
    {
        return array_get($this->storage, $settingName);
    }
}
