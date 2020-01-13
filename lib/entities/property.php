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
    /** @var Property */
    protected $property;
    /** @var string[] */
    protected $propertyPath;
    /** @var mixed */
    protected $content;
    /** @var Query */
    protected $query;

    /** @var int */
    protected $status;

    /** @var string */
    protected $storageString;

    public function __construct(int $status, $requestId, string $method, string $entityClass, string $entityId, $propertyOrError, array $propertyPath, $propertyContent, Query $query)
    {
        $this->requestId = $requestId;
        $this->method = $method;
        $this->entityId = $entityId;
        $this->entityClass = $entityClass;
        $this->propertyPath = $propertyPath;
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
            $this->content = $propertyContent;
            $this->status = 200;
            $storageSettings = $this->property->getStorageSettings();
            $storageType = array_get($storageSettings, 'type');
            $this->storageString = Storage::addStorage($storageType, $storageSettings, $method, $entityClass, $entityId, $this->propertyPath, $query);
            if ($this->storageString === Storage::STORAGE_STRING_ERROR) {
                $this->status = 500;
                $this->content = 'Storage failure for /' . $entityClass . '/' . $entityId . '/' . implode('/', $this->propertyPath) . '.';
            }

        }
    }

    public function readOnly(): bool
    {
        return $this->method === 'GET' || $this->method === 'HEAD';
    }

    public function getPropertyPath(): array
    {
        return $this->propertyPath;
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
    protected $propertyPath;

    public function __construct(int $status, array $propertyPath, $content = null)
    {
        $this->addStatus($status);
        $this->content = $content;
        $this->propertyPath = $propertyPath;
    }

    public function getContent()
    {
        return $this->content;
    }

    public function getPropertyPath(): array
    {
        return $this->propertyPath;
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

    public function createPropertyRequest($requestId, string $method, string $entityClass, string $entityId, $entityIdContent, Query $query): PropertyRequest
    {
        $propertyContent =& $entityIdContent;
        foreach ($this->propertyPath as $subPropertyName) {
            $propertyContent = array_null_get($propertyContent, $subPropertyName);
        }
        $propertyOrError = $this->status === 200 ? $this->property : $this->error;
        return new PropertyRequest($this->status, $requestId, $method, $entityClass, $entityId, $propertyOrError, $this->propertyPath, $propertyContent, $query);
    }
}

class Property
{
    const PROPERTY_TYPE = 'type';
    const PROPERTY_STORAGE = 'storage';
    const PROPERTY_ACCESS = 'access';
    const PROPERTY_REQUIRED = 'required';

    /** @var string */
    protected $propertyName;
    /** @var Type */
    protected $type;
    /** @var array */
    protected $settings;

    /** @var Property[] */
    protected $subProperties = [];

    /* TODO
      audit
      default*/

    public function __construct(string $propertyName, $settings, $rootSettings)
    {
        $this->propertyName = $propertyName;
        $this->settings = $settings;

        $typeName = getSingleSetting(self::PROPERTY_TYPE, $settings, $rootSettings);
        $this->settings['type'] = $typeName;

        $typeClass = 'Type_' . $typeName;
        //TODO handle type aliases
        //TODO error if file does not exist
        require_once './lib/types/' . $typeName . '.php';

        if (!class_exists($typeClass)) {
            echo 'Type does not exist!';
            //return null; //TODO ERROR
        }

        $this->type = new $typeClass();

        $access = getMergedSetting(self::PROPERTY_ACCESS, $settings, $rootSettings);
        $this->settings['access']= $access;

        $required = !is_null(getMergedSetting(self::PROPERTY_REQUIRED, $settings, $rootSettings));
        $this->settings['required']= $required;

        $settingStorage = array_get($settings, self::PROPERTY_STORAGE, []);
        $rootSettingStorage = array_get($rootSettings, self::PROPERTY_STORAGE, []);
        $storage = array_merge($rootSettingStorage, $settingStorage);
        $this->settings['storage'] = $storage;

        $signatureProperties = array_get($this->settings, 'signature');
        if ($signatureProperties) {
            $signature = $typeClass::signature();
            if ($this->type !== $signature) {
                // TODO this signature is an alias, do a lookup
            }
            if (!is_array($signature)) {
                echo 'ERROR Incorrect signature!';
                //TODO error
            } else {
                foreach ($signatureProperties as $subPropertyName => $subSettings) {
                    if (!array_key_exists($subPropertyName, $signature)) {
                        echo 'ERROR Incorrect signature!';
                        //TODO error
                    } else {
                        //TODO check if type signature  {"content":"string"} supports these subProperties

                        //TODO use $this->settings instead or $rootSettings
                        //var_dump($this->settings);
                        $subProperty = new Property($subPropertyName, $subSettings, $rootSettings);
                        if ($subProperty->isRequired()) {
                            $this->required = true;
                        }
                        $this->subProperties[$subPropertyName] = $subProperty;
                        $this->settings['signature'][$subPropertyName] = $subProperty->getMeta();
                    }
                }
            }
        }
    }

    public function expand(array $propertyPath, int $depth, Query &$query): array
    {
        if (count($propertyPath) < $depth) {
            $propertyPath[] = $this->propertyName;
        }

        if (count($propertyPath) === $depth) {
            if (count($this->subProperties) === 0 || $query->checkToggle('meta')) {
                return [new PropertyHandle(200, $this, $propertyPath)];
            }
        }

        if (count($this->subProperties) === 0) {
            $last = count($propertyPath) - 1;
            $partialPropertyPath = array_slice($propertyPath, 0, $last);
            $subPropertyName = $propertyPath[$last];
            //TODO expand error with entiy class and id
            return [new PropertyHandle(400, 'No subproperties available for /' . implode('/', $partialPropertyPath), $propertyPath)];
        }

        $subPropertyList = array_get($propertyPath, $depth, '*');
        if ($subPropertyList === '*') {
            $subPropertyNames = array_keys($this->subProperties);
        } else {
            $subPropertyNames = explode(',', $subPropertyList);
        }

        $propertyHandles = [];
        foreach ($subPropertyNames as $subPropertyName) {
            $propertyPathSingular = $propertyPath;
            $propertyPathSingular[$depth] = $subPropertyName;
            if (!array_key_exists($subPropertyName, $this->subProperties)) {
                //TODO expand error with entiy class and id
                $propertyHandle = new PropertyHandle(400, '/' . implode('/', $propertyPathSingular) . ' does not exist.', $propertyPathSingular);
                array_push($propertyHandles, $propertyHandle);
            } else {
                $subProperty = $this->subProperties[$subPropertyName];
                $expandedPropertyHandles = $subProperty->expand($propertyPathSingular, $depth + 1, $query);
                array_push($propertyHandles, ...$expandedPropertyHandles);
            }
        }
        return $propertyHandles;
    }

    public function getName(): string
    {
        return $this->propertyName;
    }

    public function isRequired(): bool
    {
        return $this->settings['required'];
    }

    public function getStorageSettings(): array
    {
        return $this->settings['storage'];
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
        return array_get($this->settings['storage'], $settingName);
    }
}
