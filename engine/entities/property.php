<?php
require './engine/core/types/type/type.php';

function getMergedSetting($name, &$settings, &$rootSettings)
{
    //TODO handle access and connector merges better
    if (array_key_exists($name, $settings)) {
        return $settings[$name];
    } elseif (array_key_exists($name, $rootSettings)) {
        return $rootSettings[$name];
    } else {
        return null;
    }
}

function getSingleSetting($name, &$settings, &$rootSettings)
{
    //TODO handle access and connector merges better
    if (array_key_exists($name, $settings) && array_key_exists($name, $rootSettings)) {
        return array_merge($rootSettings[$name], $settings[$name]);
    } elseif (array_key_exists($name, $settings)) {
        return $settings[$name];
    } elseif (array_key_exists($name, $rootSettings)) {
        return $rootSettings[$name];
    } else {
        return null;
    }
}

function mergeSubSettings(array &$customSubSettings, array &$defaultSubSettings): array
{
    //TODO handle access and connector merges better
    foreach ($defaultSubSettings as $subSettingName => &$subSetting) {
        if (!array_key_exists($subSettingName, $customSubSettings)) {
            $customSubSettings[$subSettingName] = $subSetting;
        }
    }
    return $customSubSettings;
}

class  PropertyRequest
{
    /** @var RequestObject */
    protected $requestObject;

    /** @var string */
    protected $entityClassName;
    /** @var string */
    protected $entityIdList;
    /** @var Property */
    protected $property;
    /** @var string[] */
    protected $propertyPath;
    /** @var mixed */
    protected $content;
    /** @var int */
    protected $status;
    /** @var string */
    protected $connectorString;

    public function __construct(int $status, RequestObject &$requestObject, string $entityClassName, string $entityIdList, $propertyOrError, array &$propertyPath, &$propertyContent)
    {


        $this->requestObject = $requestObject;
        $this->entityIdList = $entityIdList;
        $this->entityClassName = $entityClassName;
        $this->propertyPath = $propertyPath;

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
            $this->connectorString = Connector::addConnector($connectorType, $connectorSettings, $requestObject, $entityClassName, $entityIdList, $this->propertyPath);
            if ($this->connectorString === Connector::CONNECTOR_STRING_ERROR) {
                $this->status = 500;
                $this->content = 'Connector failure for /' . $entityClassName . '/' . $entityIdList . '/' . implode('/', $this->propertyPath) . '.';
            }

        }
    }

    public function isReadOnly(): bool
    {
        return $this->requestObject->getMethod() === 'GET' || $this->requestObject->getMethod() === 'HEAD';
    }

    public function isDeletion(): bool
    {
        return $this->requestObject->getMethod() === 'DELETE';
    }

    public function isEntityCreation(): bool
    {
        return ($this->requestObject->getMethod() === 'PUT' || $this->requestObject->getMethod() === 'POST')
            && count($this->propertyPath) === 0;
    }

    public function isPostId(): bool
    {
      return $this->requestObject->getMethod() === 'POST' && $this->property && $this->property->isId();
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
        return $this->requestObject->getId();
    }

    public function getMethod(): string
    {
        return $this->requestObject->getMethod();
    }

    public function getEntityIdList(): string
    {
        return $this->entityIdList;
    }

    public function setEntityId(string $entityIdList)//TODO : void
    {
        $this->entityIdList = $entityIdList;
    }

    public function getEntityClass(): string
    {
        return $this->entityClassName;
    }

    public function getProperty()//TODO : ?Property
    {
        return $this->property;
    }

    public function getContent()
    {
        return $this->content;
    }

    public function getQuery(): Query
    {
        return $this->requestObject->getQuery();
    }

    public function getRequestUri(): string
    {
        return $this->requestObject->getUri();
    }

    public function getRequestObject(): RequestObject
    {
        return $this->requestObject;
    }

    public function getConnectorString(): string
    {
        return $this->connectorString;
    }

    public function processBeforeConnector(&$newContent, &$currentContent)
    {
        return $this->property->processBeforeConnector($this->requestObject, $newContent, $currentContent);
    }

    public function updateAutoIncrementedUri(array &$remappedAutoIncrementedUris)//TODO : void
    {
        if($this->getMethod() !== 'POST') return;
        $this->requestObject->setMethod('PUT');
        $stubUri = $this->entityClassName.'/'.$this->entityId;
        $autoIncrementedUri = array_get($remappedAutoIncrementedUris,$stubUri);
        if(is_null($autoIncrementedUri)) return;
        $path = explode('/',$autoIncrementedUri);
        if(count($path)<2) return;
        $this->entityIdList = $path[1];
    }

}

class PropertyResponse extends Response
{
    protected $content;
    /** @var string[] */
    protected $propertyPath;
    // TODO ?Property
    public function __construct(&$property, RequestObject &$requestObject, int $status, array &$propertyPath, &$content = null)
    {
        $this->propertyPath = $propertyPath;
        if(is_null($property)){
          $this->addStatus(400);
          $this->content = 'Illegal property '.$propertyPath[0].'.';
          /*DISABLED as it will appear as is entities exist
        }else if($status === 404 && $property->hasDefault()){
          $this->addStatus(200);
          $this->content = $property->getDefault();*/
        }else{
            $processResponse = $property->processAfterConnector($requestObject, $content);
            if ($processResponse->succeeded()) {
                $this->addStatus($status);
                $this->content = $processResponse->getContent();
            } else {
                $this->status = $processResponse->getStatus();
                $this->content = $processResponse->getError();
            }
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

    public function __construct(int $status, $propertyOrError, array &$propertyPath)
    {
        $this->status = $status;
        $this->propertyPath = $propertyPath;
        if ($status === 200) {
            $this->property = $propertyOrError;
        } else {
            $this->error = $propertyOrError;
        }
    }

    public function createPropertyRequest(RequestObject &$requestObject, string $entityClassName, string $entityId, &$entityIdContent): PropertyRequest
    {
        $propertyContent = $entityIdContent;
        foreach ($this->propertyPath as &$subPropertyName) {
            $propertyContent = array_null_get($propertyContent, $subPropertyName);
        }
        $propertyOrError = $this->status === 200 ? $this->property : $this->error;
        return new PropertyRequest($this->status, $requestObject, $entityClassName, $entityId, $propertyOrError, $this->propertyPath, $propertyContent);
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

    public function __construct(&$parent, int $depth, string $propertyName, &$settings, &$rootSettings)
    {
        $this->propertyName = $propertyName;
        $this->settings = $settings;
        $this->parent = $parent;
        $this->depth = $depth;

        $this->typeName = getSingleSetting(self::PROPERTY_TYPE, $settings, $rootSettings);

        if(is_null($this->typeName) && getSingleSetting('index', $settings, $rootSettings)) $this->typeName = 'id';

        if (!is_string($this->typeName)) {
            echo "ERROR: invalid typename";
            //TODO error
        }
        $this->settings['type'] = $this->typeName;

        $this->typeClass = Type::get($this->typeName);
        if ($this->typeClass === null) {
            echo "ERROR: invalid typeclass";
            //TODO error
        }

        $access = getMergedSetting(self::PROPERTY_ACCESS, $settings, $rootSettings);
        $this->settings['access'] = $access;

        $required = getMergedSetting(self::PROPERTY_REQUIRED, $settings, $rootSettings);
        if(is_null($required)) $required = false;
        $this->settings['required'] = $required;

        $settingConnector = array_get($settings, self::PROPERTY_CONNECTOR, []);
        $rootSettingConnector = array_get($rootSettings, self::PROPERTY_CONNECTOR, []);
        $propertyConnector = array_merge($rootSettingConnector, $settingConnector);
        $this->settings[self::PROPERTY_CONNECTOR] = $propertyConnector;

        $customSignatureSettings = array_get($this->settings, 'signature');
        if (is_array($customSignatureSettings)) {
            $signature = $this->typeClass::signature($this->settings);
            // TODO check if all required props for the signature are there

            foreach ($customSignatureSettings as $subPropertyName => &$customSubSettings) {
                if (!array_key_exists($subPropertyName, $signature)) {
                    echo 'ERROR Incorrect signature!';
                    //TODO error
                } else {

                    $defaultSubSettings = $signature[$subPropertyName];
                    $customSubConnector = array_get($customSubSettings, self::PROPERTY_CONNECTOR, []);
                    $defaultSubConnector = array_get($defaultSubSettings, self::PROPERTY_CONNECTOR, []);

                    //TODO check if type matches and supports these customSubSettings
                    //TODO allow for multi types "id|string"

                    $subSettings = mergeSubSettings($customSubSettings, $defaultSubSettings);
                    $subSettings[self::PROPERTY_CONNECTOR] = array_merge($propertyConnector, $defaultSubConnector, $customSubConnector);
                    //TODO use $this->settings instead or $rootSettings
                    $subProperty = new Property($this, $this->depth + 1, $subPropertyName, $subSettings, $rootSettings);

                    $this->subProperties[$subPropertyName] = $subProperty;
                    $this->settings['signature'][$subPropertyName] = $subProperty->getMeta();
                }

            }
        }
    }

    public function serveContent(int $status, &$content)
    {
        return $this->typeClass::serve($status, $content);
    }

    public function getUri($entityId = null): string //TODO  ?string
    {
        return $this->parent->getUri() . '/' . $this->propertyName;
    }

    public function getDepth(): int
    {
        return $this->depth;
    }

    public function isId(): bool
    {
        return $this->typeName === 'id' || array_get($this->settings,'index',false);
    }

    protected function isPrimitive(): bool
    {
        return empty($this->subProperties);
    }

    public function getProperty(array &$propertyPath)//TODO : ?Property
    {
        if (count($propertyPath) === 0) return $this;
        $subPropertyName = $propertyPath[0];
        if ($this->typeClass::validateSubPropertyPath($propertyPath, $this->settings)) return $this;
        if (!is_string($subPropertyName)) return null;
        $subProperty = array_get($this->subProperties, $subPropertyName);
        if (!$subProperty) return null;
        return $subProperty->getProperty(array_slice($propertyPath, 1));
    }

    public function expand(array $propertyPath, int $depth, Query &$query): array
    {
        if (count($propertyPath) < $depth) $propertyPath[] = $this->propertyName;

        if (count($propertyPath) === $depth && $this->isPrimitive()) return [new PropertyHandle(200, $this, $propertyPath)];

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
            foreach ($this->subProperties as &$subProperty) {
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

    public function hasDefault(): bool
    {
        return array_key_exists('default',$this->settings);
    }

    public function getDefault()
    {
        return array_get($this->settings,'default');
    }

    public function validateContent(&$content): bool
    {
        return $this->typeClass::validateContent($content, $this->settings);
    }

    public function getAccessSettings(): array
    {
        return array_get($this->settings, 'access', []);
    }

    public function getConnectorSetting($settingName, $default = null)
    {
        return array_get($this->settings['connector'], $settingName, $default);
    }

    public function processBeforeConnector(RequestObject &$requestObject, &$newContent, &$currentContent)
    {
        $method = $requestObject->getMethod();

        if(($method === 'POST' || $method === 'PUT') && is_null($newContent)){ // insert default value
          $newContent = $this->getDefault();
        }

        return $this->typeClass::processBeforeConnector($method, $newContent, $currentContent, $this->settings);
    }

    public function processAfterConnector(RequestObject &$requestObject, &$content)
    {
        $method = $requestObject->getMethod();
        $accessGroups = $requestObject->getAccessGroups();
        $accessSettings = array_get($this->settings, 'access', []);
        if (!AccessControl::check($method, $accessSettings, $accessGroups)) {
            $content = null;
            $errorMessage = 'Forbidden';
            return new ProcessResponse(403, $content, $errorMessage);
        }
        return $this->typeClass::processAfterConnector($method, $content, $this->settings);
    }

    public function sort(&$content1, &$content2): int
    {
        return $this->typeClass::sort($content1, $content2, $this->settings);
    }
}
