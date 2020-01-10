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
    /** @var mixed */
    protected $requestId;

    /** @var string */
    protected $method;
    /** @var string */
    protected $entityClass;
    /** @var string */
    protected $entityId;
    /** @var ?Property */
    protected $property;
    /** @var string[] */
    protected $subPropertyPath;
    /** @var mixed */
    protected $content;
    /** @var Query */
    protected $query;

    /** @var int */
    protected $status;

    /** @var string */
    protected $storageString;

    public function __construct(int $status, $requestId, string $method, string $entityClass, string $entityId, $propertyOrError, array $propertyPath, $content, Query $query)
    {
        $this->requestId = $requestId;
        $this->method = $method;
        $this->entityId = $entityId;
        $this->entityClass = $entityClass;
        $this->subPropertyPath = $propertyPath;
        $this->query = $query;
        if ($status !== 200) {
            $this->status = $status;
            $this->storageString = Storage::STORAGE_STRING_ERROR;
            $this->content = $propertyOrError;
        } elseif (is_string($propertyOrError)) {
            $this->status = 500;
            $this->storageString = Storage::STORAGE_STRING_ERROR;
            $this->content = $propertyOrError;
        } else {
            $this->property = $propertyOrError;
            $this->content = $content;
            if ($method === 'PUT' && !$this->property->validate($content)) {
                $this->status = 400;
                $this->storageString = Storage::STORAGE_STRING_ERROR;
                $this->content = 'Invalid content for /' . $entityClass . '/' . $entityId . '/' . $this->property->getName() . '.';
            } else {
                $this->status = 200;
                $storageSettings = $this->property->getStorageSettings();
                $storageType = array_get($storageSettings, 'type');
                $this->storageString = Storage::addStorage($storageType, $storageSettings, $method, $entityClass, $entityId, $query);
                if ($this->storageString === null) {
                    $this->status = 500;
                    $this->content = 'Storage failure for /' . $entityClass . '/' . $entityId . '/' . $this->property->getName() . '.';
                    $this->storageString = Storage::STORAGE_STRING_ERROR;
                }
            }
        }
    }

    public function readOnly(): bool
    {
        return $this->method !== 'PUT' && $this->method !== 'DELETE';
    }

    public function getStatus(): int
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

    public function getProperty(): ?Property
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

    public function getStorageString(): string
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

class PropertyHandle
{
    /** @var int */
    protected $status;
    /** @var string */
    protected $error;
    /** @var Property */
    protected $property;
    /** @var string[] */
    protected $propertyPath;

    public function __construct(int $status, $propertyOrError, array $propertyPath)
    {
        $this->status = $status;
        $this->propertyPath = $propertyPath;
        if ($status === 200) {
            $this->property = $propertyOrError;
        } else {
            $this->error = $propertyOrError;
        }
    }

    public function createPropertyRequest($requestId, string $method, string $entityClass, string $entityId, $content, Query $query): PropertyRequest
    {
        if ($this->status === 200) {
            return new PropertyRequest($this->status, $requestId, $method, $entityClass, $entityId, $this->property, $this->propertyPath, $content, $query);
        } else {
            return new PropertyRequest($this->status, $requestId, $method, $entityClass, $entityId, $this->error, $this->propertyPath, $content, $query);
        }
    }
}

class Property
{
    const PROPERTY_TYPE = 'type';
    const PROPERTY_STORAGE = 'storage';
    const PROPERTY_ACCESS = 'access';
    /** @var string */
    protected $propertyName;
    /** @var Type */
    protected $type;
    /** @var array */
    protected $settings;

    /** @var array */
    protected $storage;
    /** @var array */
    protected $access;
    /** @var Property[] */
    protected $subProperties = [];

    /* TODO
       required
      audit
      default*/

    public function __construct(string $propertyName, $settings, $rootSettings)
    {
        $this->propertyName = $propertyName;
        $this->settings = $settings;

        $typeName = getSingleSetting(self::PROPERTY_TYPE, $settings, $rootSettings);

        $typeClass = 'Type_' . $typeName;
        //TODO error if file does not exist
        require_once './lib/types/' . $typeName . '.php';

        if (!class_exists($typeClass)) {
            echo 'Type does not exist!';
            //return null; //TODO ERROR
        }

        $this->type = new $typeClass();

        $this->storage = getMergedSetting(self::PROPERTY_STORAGE, $settings, $rootSettings);
        $this->access = getMergedSetting(self::PROPERTY_ACCESS, $settings, $rootSettings);

        $settingStorage = array_get($settings, self::PROPERTY_STORAGE, []);
        $rootSettingStorage = array_get($rootSettings, self::PROPERTY_STORAGE, []);
        $this->storage = array_merge($rootSettingStorage, $settingStorage);

        $combinedProperties = array_get($this->settings, 'combined');
        if ($combinedProperties) {
            foreach ($combinedProperties as $subPropertyName => $subSettings) {
                //TODO check if type signature  {"content":"string"} supports these subProperties
                $this->subProperties[$subPropertyName] = new Property($subPropertyName, $subSettings, $rootSettings);
            }
        }
    }

    public function expand(array $propertyPath, int $depth): array
    {
        if (count($propertyPath) <= $depth && count($this->subProperties) === 0) {
            return [new PropertyHandle(200, $this, $propertyPath)];
        }

        if (count($this->subProperties) === 0) {
            return [new PropertyHandle(404, 'No subproperties available.', $propertyPath)]; //TODO expand error message
        }

        $subPropertyList = array_get($propertyPath, $depth, '*');
        if ($subPropertyList === '*') {
            $subPropertyNames = array_keys($this->subProperties);
        } else {
            $subPropertyNames = explode(',', $subPropertyList);
        }

        $propertyHandles = [];
        foreach ($subPropertyNames as $subPropertyName) {
            if (!array_key_exists($subPropertyName, $this->subProperties)) {
                return [new PropertyHandle(404, 'Subproperty "' . $subPropertyName . '" does not exist.', $propertyPath)]; //TODO expand error message
            } else {
                $subProperty = $this->subProperties[$subPropertyName];
                $expandedPropertyHandles = $subProperty->expand($propertyPath, $depth + 1);
                array_push($propertyHandles, ...$expandedPropertyHandles);
            }
        }
        return $propertyHandles;
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
