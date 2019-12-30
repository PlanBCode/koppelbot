<?php

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

    public function __construct($requestId, string $method, string $entityClass, string $entityId, Property $property, $content, Query $query)
    {
        $this->requestId = $requestId;
        $this->method = $method;
        $this->entityId = $entityId;
        $this->entityClass = $entityClass;
        $this->property = $property;
        $this->content = $content;
        $this->query = $query;
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
    const PROPERTY_TYPE    = 'type';
    const PROPERTY_STORAGE = 'storage';
    const PROPERTY_ACCESS  = 'access';

    protected $propertyName;

    protected $type;//TODO string,number
    protected $settings;

    protected $storage;
    protected $access;
    protected $storageString;

    /* TODO
       required
      audit
      default*/

    public function __construct(string $propertyName, $settings, $rootSettings)
    {
        $this->propertyName = $propertyName;
        $this->settings = $settings;

        $this->type = getSingleSetting(self::PROPERTY_TYPE, $settings, $rootSettings);
        $this->storage = getMergedSetting(self::PROPERTY_STORAGE, $settings, $rootSettings);
        $this->access = getMergedSetting(self::PROPERTY_ACCESS, $settings, $rootSettings);

        $settingStorage = array_get($settings, self::PROPERTY_STORAGE, []);
        $rootSettingStorage = array_get($rootSettings, self::PROPERTY_STORAGE, []);
        $this->storage = array_merge($rootSettingStorage, $settingStorage);

        if (array_key_exists('type', $this->storage)) {
            $type = $this->storage['type'];
        } else {
            //TODO 500 error
        }

        //TODO setupAccess  -> 403

        $this->storageString = Storage::addStorage($type, $this->storage);
        if ($this->storageString === null) {
            //TODO 500 error
        }
    }

    public function getName()
    {
        return $this->propertyName;
    }

    public function getStorageString()
    {
        return $this->storageString;
    }

    public function getStorageSetting($settingName)
    {
        return array_get($this->storage, $settingName);
    }
}
