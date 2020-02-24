<?php
require './engine/core/types/type/type.php';

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
    protected $connectorString;

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
            $this->connectorString = Connector::CONNECTOR_STRING_ERROR;
            $this->content = $propertyOrError;
        } elseif (is_string($propertyOrError)) {
            $this->status = 500;
            $this->connectorString = Connector::CONNECTOR_STRING_ERROR;
            $this->content = $propertyOrError;
        } else {
            $this->property = $propertyOrError;
            $this->content = $propertyContent;
            $this->status = 200;
            $connectorSettings = $this->property->getConnectorSettings();
            $connectorType = array_get($connectorSettings, 'type');
            $this->connectorString = Connector::addConnector($connectorType, $connectorSettings, $method, $entityClass, $entityId, $this->propertyPath, $query);
            if ($this->connectorString === Connector::CONNECTOR_STRING_ERROR) {
                $this->status = 500;
                $this->content = 'Connector failure for /' . $entityClass . '/' . $entityId . '/' . implode('/', $this->propertyPath) . '.';
            }

        }
    }

    public function isReadOnly(): bool
    {
        return $this->method === 'GET' || $this->method === 'HEAD';
    }

    public function isDeletion(): bool
    {
        return $this->method === 'DELETE';
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

    public function getConnectorString(): string
    {
        return $this->connectorString;
    }

    public function processBeforeConnector(&$newContent, &$currentContent)
    {
        return $this->property->processBeforeConnector($this->method, $newContent, $currentContent);
    }
}

class PropertyResponse extends Response
{
    protected $content;
    /** @var Property */
    protected $property;
    /** @var string[] */
    protected $propertyPath;

    public function __construct(Property &$property, string $method, int $status, array $propertyPath, $content = null)
    {
        $this->propertyPath = $propertyPath;
        $this->property = $property;
        $processResponse = $property->processAfterConnector($method,$content);
        if($processResponse->succeeded()){
            $this->addStatus($status);
            $this->content = $processResponse->getContent();
        }else{
            $this->status = $processResponse->getStatus();
            $this->content = $processResponse->getError();
        }
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
    const PROPERTY_CONNECTOR = 'connector';
    const PROPERTY_ACCESS = 'access';
    const PROPERTY_REQUIRED = 'required';

    /** @var Property|EntityClass */
    protected $parent;
    /** @var int */
    protected $depth;
    /** @var string */
    protected $propertyName;
    /** @var string */
    protected $typeName;
    protected $typeClass;
    /** @var array */
    protected $settings;

    /** @var Property[] */
    protected $subProperties = [];

    /* TODO
      audit
      default*/

    public function __construct($parent, int $depth, string $propertyName, $settings, $rootSettings)
    {
        $this->propertyName = $propertyName;
        $this->settings = $settings;
        $this->parent = $parent;
        $this->depth = $depth;

        $this->typeName = getSingleSetting(self::PROPERTY_TYPE, $settings, $rootSettings);
        $this->settings['type'] = $this->typeName;

        $this->typeClass = Type::get($this->typeName);
        if ($this->typeClass === null) {
            //TODO error
        }

        $access = getMergedSetting(self::PROPERTY_ACCESS, $settings, $rootSettings);
        $this->settings['access'] = $access;

        $required = !is_null(getMergedSetting(self::PROPERTY_REQUIRED, $settings, $rootSettings));
        $this->settings['required'] = $required;

        $settingConnector = array_get($settings, self::PROPERTY_CONNECTOR, []);
        $rootSettingConnector = array_get($rootSettings, self::PROPERTY_CONNECTOR, []);
        $connector = array_merge($rootSettingConnector, $settingConnector);
        $this->settings['connector'] = $connector;

        $signatureProperties = array_get($this->settings, 'signature');
        if (is_array($signatureProperties)) {
            $signature = $this->typeClass::signature($this->settings);
            if ($this->typeName !== $signature) {
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
                        $subProperty = new Property($this, $this->depth + 1, $subPropertyName, $subSettings, $rootSettings);
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

    public function getUri(?string $entityId = null): string
    {
        return $this->parent->getUri() . '/' . $this->propertyName;
    }

    public function getDepth(): int
    {
        return $this->depth;
    }

    protected function isId(): bool
    {
        return (array_get($this->settings['connector'], 'key', false));
    }

    protected function isPrimitive(): bool
    {
        return empty($this->subProperties);
    }

    public function getProperty(array &$propertyPath): ?Property
    {
        if (count($propertyPath) === 0) return $this;
        $subPropertyName = $propertyPath[0];
        if (!is_string($subPropertyName)) return null;
        $subProperty = array_get($this->subProperties, $subPropertyName);
        if (!$subProperty) return null;
        return $subProperty->getProperty(array_slice($propertyPath, 1));
    }

    public function expand(array $propertyPath, int $depth, Query &$query): array
    {
        if (count($propertyPath) < $depth) {
            $propertyPath[] = $this->propertyName;
        }

        if (count($propertyPath) === $depth) {
            if ($this->isPrimitive() || $query->checkToggle('meta')) {
                return [new PropertyHandle(200, $this, $propertyPath)];
            }
        }


        if ($this->isPrimitive()) {
            $subPropertyPath = array_slice($propertyPath, 1);
            if ($this->typeClass::validateSubPropertyPath($subPropertyPath, $this->settings)) { // array and object type allow subproperty paths
                return [new PropertyHandle(200, $this, $propertyPath)];
            } else {
                return [new PropertyHandle(400, 'No subproperties available for ' . $this->getUri(), $propertyPath)];
            }
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

    public function getTypeName(): string
    {
        return $this->typeName;
    }

    public function isRequired(): bool
    {
        if ($this->settings['required']) {
            return true;
        } elseif ($this->isPrimitive()) {
            return $this->isId() && $this->typeName !== 'id';
        } else {
            foreach ($this->subProperties as $subProperty) {
                if ($subProperty->isRequired()) {
                    return true;
                }
            }
            return false;
        }
    }

    public function getConnectorSettings(): array
    {
        return $this->settings['connector'];
    }

    public function getMeta(): array
    {
        return $this->settings;
    }

    public function validateContent($content): bool
    {
        return $this->typeClass::validateContent($content, $this->settings);
    }

    public function getConnectorSetting($settingName, $default = null)
    {
        return array_get($this->settings['connector'], $settingName, $default);
    }

    public function processBeforeConnector(string $method, &$newContent, &$currentContent)
    {
        return $this->typeClass::processBeforeConnector($method, $newContent, $currentContent, $this->settings);
    }

    public function processAfterConnector(string $method, &$content)
    {
        return $this->typeClass::processAfterConnector($method, $content, $this->settings);
    }
}
