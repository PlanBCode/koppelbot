<?php
require './engine/entities/property.php';
require './engine/access/access.php';

/**
 * Create a single branch of the property path for given property. ('a',['a,b','c','d.e']) -> ['a','c','d','e']
 * @param  string $propertyName [description]
 * @param  array  $propertyPath [description]
 * @return array                [description]
 */
function createSingularPropertyPath($propertyName, array &$propertyPath): array
{
  $propertyPathSingular = $propertyPath;
  $propertyPathSingular[0] = $propertyName;
  foreach ($propertyPathSingular as &$subPropertyName) {
    $subPropertyName = explode('.', $subPropertyName);
  }
  return array_merge(...$propertyPathSingular);
}

class EntityClass
{
    /** @var EntityClass[] */
    static $entityClasses = [];

    static public function get(string $entityClassName, array &$accessGroups)// TODO: ?EntityClass
    {

        if (array_key_exists($entityClassName, self::$entityClasses)) {
            return self::$entityClasses[$entityClassName];
        } else {
            $fileNames = glob('{./engine/core,./custom/*}/entities/' . $entityClassName . '.json', GLOB_BRACE);
            if (count($fileNames) === 0) return null;
            $fileName = $fileNames[0];
            $fileContent = file_get_contents($fileName); //TODO make safe
            //TODO check if this goes well


            $meta = json_decode($fileContent, true);//TODO catch parse error
            //TODO maybe resolve inheritance

            // Check if any of current sessions has access to this entity
            if (array_key_exists('_', $meta)) {
                $accessSettings = array_get($meta['_'], 'access', []);
                if (!AccessControl::check('HEAD', $accessSettings,  $accessGroups)) return null;
            }
            $entityClass = new EntityClass($entityClassName, $meta);
            self::$entityClasses[$entityClassName] = $entityClass;
            return $entityClass;
        }
    }

    /** @var Property[] */
    protected $properties = []; // decoded json properties object
    /** @var string */
    protected $entityClassName;

    public function getEntityClassName():string
    {
      return $this->entityClassName;
    }

    protected function __construct(string $entityClassName, array &$meta)
    {
        $this->entityClassName = $entityClassName;
        $rootSettings = array_get($meta, '_', []);
        foreach ($meta as $propertyName => &$settings) {
            if ($propertyName !== '_') {
                $this->properties[$propertyName] = new Property($this, 0, $propertyName, $settings, $rootSettings);
            }
        }
    }

    public function getIdPropertyName() // TODO : ?string
    {
      foreach ($this->properties as &$property){
        if($property->isId()) return $property->getName();
      }
      return null;
    }

    public function hasProperty(array &$propertyPath): bool
    {
      if (count($propertyPath) === 0) return false;
      $propertyName = $propertyPath[0];
      if (!is_string($propertyName)) return false;
      $property = array_get($this->properties, $propertyName);
      if (!$property) return false;
      if (count($propertyPath) === 1) return true;
      $subPropertyPath = array_slice($propertyPath, 1);
      return $property->hasProperty($subPropertyPath);
    }

    public function getProperty(array &$propertyPath)//TODO : ?Property
    {
        if (count($propertyPath) === 0) return null;
        $propertyName = $propertyPath[0];
        if (!is_string($propertyName)) return null;
        $property = array_get($this->properties, $propertyName);
        if (!$property) return null;
        $subPropertyPath = array_slice($propertyPath, 1);
        return $property->getProperty($subPropertyPath);
    }

    public function getUri($entityId = null): string // ?string
    {
        return '/' . $this->entityClassName . '/' . (is_null($entityId) ? '*' : $entityId);
    }

    protected function expand(array &$propertyPath, Query &$query, RequestObject &$requestObject): array
    {
        /** @var string */
        $propertyList = array_get($propertyPath, 0, '*');
        if ($propertyList === '*') {
            $propertyNames = array_keys($this->properties);
        } else {
            $propertyNames = explode(',', $propertyList);
        }
        $propertyHandles = [];
        foreach ($propertyNames as &$propertyName) {
            $propertyPathSingular = createSingularPropertyPath($propertyName, $propertyPath);
            $propertyName =  $propertyPathSingular[0];
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

    protected function validateAndCheckRequired(RequestObject &$requestObject, string $entityIdList, &$entityIdContent, array &$errorPropertyRequests)
    {
        $method = $requestObject->getMethod();

        if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
            foreach ($this->properties as $propertyName => &$property) {
                $propertyContent = array_null_get($entityIdContent, $propertyName);
                $propertyPath = [$propertyName];
                if (!is_null($propertyContent)) {
                  if($method === 'PUT' && $property->isId() && $propertyContent !== $entityIdList ){
                    $error = '/' . $this->entityClassName . '/' . $entityIdList . '/' . $propertyName . ' is an id and should not be supplied.';
                    $errorPropertyRequest = new PropertyRequest(400, $requestObject, $this->entityClassName, $entityIdList, $error, $propertyPath, $propertyContent);
                    $errorPropertyRequests[] = $errorPropertyRequest;
                  } else if ( $method === 'POST' && $property->isId()) {
                        $error = '/' . $this->entityClassName . '/' . $entityIdList . '/' . $propertyName . ' is an auto incremented id and should not be supplied.';
                        $errorPropertyRequest = new PropertyRequest(400, $requestObject, $this->entityClassName, $entityIdList, $error, $propertyPath, $propertyContent);
                        $errorPropertyRequests[] = $errorPropertyRequest;
                    } else if (!$property->validateContent($propertyContent)) {
                        $error = 'Invalid content for /' . $this->entityClassName . '/' . $entityIdList . '/' . $propertyName;
                        $errorPropertyRequest = new PropertyRequest(400, $requestObject, $this->entityClassName, $entityIdList, $error, $propertyPath, $propertyContent);
                        $errorPropertyRequests[] = $errorPropertyRequest;
                    }
                } elseif
                (($method === 'PUT' || $method === 'POST') && $property->isRequired()) {
                    if($method === 'PUT' && $property->isId()){
                      $entityIdContent[$propertyName] =  $entityIdList;
                    }else{
                      $error = 'Missing content for required /' . $this->entityClassName . '/' . $entityIdList . '/' . $propertyName;
                      $errorPropertyRequest = new PropertyRequest(400, $requestObject, $this->entityClassName, $entityIdList, $error, $propertyPath, $propertyContent);
                      $errorPropertyRequests[] = $errorPropertyRequest;
                    }
                }
            }
        }
    }

    protected function createPropertyRequests(RequestObject &$requestObject, string $entityIdList, array &$propertyPath, &$entityClassContent): array
    {
        $method = $requestObject->getMethod();
        /** @var string[] */
        $entityIds = [];
        if ($entityIdList === '*') {
            if ($method === 'POST') {
               $entityIds = is_array($entityClassContent) ? array_keys($entityClassContent) : []; // these will be temporary ids
            } elseif ($method === 'HEAD') {
                //TODO this is tautology requesting the existance of all existing entities
            } elseif ($method === 'PUT') {
                //TODO error or overwrite everything?
            } else {
                $entityIds = ['*']; // TODO retrieve all ids
            }
        } else {
            $entityIds = explode(',', $entityIdList);
        }
        if ($method === 'PUT' && ($entityIdList === '*' || count($propertyPath) > 0)) {
            /** @var PropertyHandle[] */
            $propertyHandles = [new PropertyHandle(400, 'PUT method expects uri of the form /' . $this->entityClassName . '/$ID', [$this->entityClassName])];
        } elseif ($method === 'POST' && ($entityIdList !== '*' || count($propertyPath) > 0)) {
            /** @var PropertyHandle[] */
            $propertyHandles = [new PropertyHandle(400, 'POST method expects uri of the form /' . $this->entityClassName . '', [$this->entityClassName])];
        } else {
            $query = $requestObject->getQuery();
            /** @var PropertyHandle[] */
            $propertyHandles = $this->expand($propertyPath, $query, $requestObject);
        }
        /** @var PropertyRequest[] */
        $propertyRequests = [];
        /** @var PropertyRequest[] */
        $errorPropertyRequests = [];

        if ($method === 'HEAD' || $method === 'GET' || $method === 'DELETE' ) {
          $entityIdContent = null;
          foreach ($propertyHandles as &$propertyHandle) {
            $propertyRequests[] = $propertyHandle->createPropertyRequest($requestObject, $this->entityClassName, $entityIdList, $entityIdContent);
          }
        }else{ // for write methods entityIdList is expanded to separate requests
          foreach ($entityIds as $entityId) {
              $entityIdContent = array_null_get($entityClassContent, $entityId);

              $this->validateAndCheckRequired($requestObject, $entityId, $entityIdContent, $errorPropertyRequests);

              foreach ($propertyHandles as&$propertyHandle) {
                  $propertyRequests[] = $propertyHandle->createPropertyRequest($requestObject, $this->entityClassName, $entityId, $entityIdContent);
              }
          }
        }
        if (!empty($errorPropertyRequests)) return $errorPropertyRequests;

        return $propertyRequests;
    }

    public
    function createConnectorRequests(RequestObject &$requestObject, string $entityIdList, array $propertyPath, &$entityClassContent)
    {
        /** @var PropertyRequest[] */
        $propertyRequests = $this->createPropertyRequests($requestObject, $entityIdList, $propertyPath, $entityClassContent);
        //TODO only when adding new : check if entity exists
        //TODO check if required properties are handled

        /** @var ConnectorRequest[] */
        $connectorRequests = [];
        foreach ($propertyRequests as &$propertyRequest) {
            $connectorString = $propertyRequest->getConnectorString();
            if (!array_key_exists($connectorString, $connectorRequests)) {
                $connectorRequests[$connectorString] = new ConnectorRequest();
            }
            $connectorRequests[$connectorString]->add($propertyRequest);
        }
        return $connectorRequests;
    }
}

function cleanWrapping(&$wrapper, int $status)//TODO : void
{
    if (!is_array($wrapper)) {
        return;
    } elseif ($status === 207) {
        foreach ($wrapper as $subPropertyName => &$subWrapper) {
            if (array_key_exists('content2', $subWrapper)) { // outer leaf
                $subWrapper['content'] = $subWrapper['content2'];
                unset($subWrapper['content2']); //TODO more efficient
            } else { // inner node
                $subContent =& $subWrapper['content'];
                $subStatus = $subWrapper['status'];
                cleanWrapping($subContent, $subStatus);
            }
        }
    } else {
        foreach ($wrapper as $subPropertyName => &$subWrapper) {
            if (!is_array($subWrapper) || !array_key_exists('status', $subWrapper)) continue;
            $subStatus = $subWrapper['status']; // TODO Should match with $status;
            if (array_key_exists('content2', $subWrapper)) {  // outer leaf
                $wrapper[$subPropertyName] = $subWrapper['content2'];
            } else { // inner node
                $wrapper[$subPropertyName] = $subWrapper['content'];
                cleanWrapping($subWrapper, $subStatus);
            }
        }
    }
}

class EntityResponse extends Response
{
    /** @var  EntityClass */
    protected $entityClass;
    protected $entityId;

    /** @var RequestObject */
    protected $requestObject;

    /** @var PropertyResponse[] */
    protected $propertyResponses = [];

    public function __construct(EntityClass &$entityClass, $entityId, RequestObject &$requestObject)
    {
        $this->entityId = $entityId;
        $this->entityClass = $entityClass;
        $this->requestObject = $requestObject;
    }

    public function add(int $status, array &$propertyPath, &$content)
    {
        $method = $this->requestObject->getMethod();
        if ($method === 'POST' && $status === 404) return $this; // POST request are made with dummy entityId's if hey can't be found. Ignore it.

        $property = $this->entityClass->getProperty($propertyPath);
        $propertyResponse = new PropertyResponse($property, $this->requestObject, $status, $propertyPath, $content);
        $this->addStatus($propertyResponse->getStatus());
        $subUri = implode('/',$propertyPath);
        $this->propertyResponses[$subUri] = $propertyResponse;
    }

    public function merge(EntityResponse &$entityResponse)
    {
        $this->addStatus($entityResponse->getStatus());
        foreach ($entityResponse->propertyResponses as $subUri => &$propertyResponse) {
            $this->propertyResponses[$subUri] = $propertyResponse; //TODO check for duplicate responses for propertyName ?
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

    public function getRequestObject(): RequestObject
    {
        return $this->requestObject;
    }

    public function getIdPropertyName()
    {
      return $this->entityClass->getIdPropertyName();
    }
    private function collapseContent(&$content)
    {
        $requestPropertyPath = array_slice($this->requestObject->getPath(), 2);
        $requestPropertyPath = count($requestPropertyPath)>0
          ? createSingularPropertyPath($requestPropertyPath[0], $requestPropertyPath)
          : [];
        foreach ($requestPropertyPath as &$subPropertyName) {
            if (!is_array($content) || count($content) > 1 || strpos($subPropertyName,',') !== false) break;
            elseif (array_key_exists($subPropertyName, $content)) {
                $content =& array_get($content, $subPropertyName);
                $this->status = array_get($content, 'status');
                if (array_key_exists('content', $content)) $content =& array_get($content, 'content');
                elseif (array_key_exists('content2', $content)) $content =& array_get($content, 'content2');
            } else $content = [];
        }
    }

    public function getContent()
    {
        $content = [];
        foreach ($this->propertyResponses as &$propertyResponse) {
            $propertyPath = $propertyResponse->getPropertyPath();
            $wrapperIterator =& $content;
            foreach ($propertyPath as $depth => &$subPropertyName) {
                $subStatus = $propertyResponse->getStatus();
                if ($depth === count($propertyPath) - 1) { // outer leaf
                    $subContent = $propertyResponse->getContent();
                    // new PropertyResponseNode($subStatus, $subContent, true);
                    $wrapperIterator[$subPropertyName] = ["status" => $subStatus, "content2" => $subContent];
                } else { // inner node
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

        // for singular requests ('/entity/id' versus '/entity/id1,id2') simplify the response
        // from {entity: {id :'content'}} to 'content'
        if (!$this->requestObject->getQuery()->checkToggle('expand')) {
            $this->collapseContent($content);
        }

        // {a: {status:200, content: 1}, b: {status:200, content: 2}} => {a:1,b:2}
        // {a: {status:200, content: 1}, b: {status:400, content: 'error'}} => remains the same
        cleanWrapping($content, $this->getStatus());
        return $content;
    }
}

class EntityClassResponse extends Response
{
    /** @var EntityClass */
    protected $entityClass;
    /** @var RequestObject */
    protected $requestObject;
    /** @var EntityResponse[] */
    protected $entityResponses = [];

    public function __construct($entityClassName, RequestObject &$requestObject)
    {
        $accessGroups = $requestObject->getAccessGroups();
        $this->entityClass = EntityClass::get($entityClassName, $accessGroups);
        $this->requestObject = $requestObject;
    }

    public function add(int $status, string $entityId, array $propertyPath, $content)
    {
        $this->addStatus($status);
        if (!array_key_exists($entityId, $this->entityResponses)) {
            $this->entityResponses[$entityId] = new EntityResponse($this->entityClass, $entityId, $this->requestObject);
        }
        $this->entityResponses[$entityId]->add($status, $propertyPath, $content);
    }

    public function merge(EntityClassResponse &$entityClassResponse)
    {
        $this->addStatus($entityClassResponse->getStatus());
        foreach ($entityClassResponse->entityResponses as $entityId => &$entityResponse) {
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
        $entityIdList = $this->requestObject->getEntityIdList();
        $requestedMultipleIds = $entityIdList === '*' || strpos($entityIdList, ',') !== false;

        if (!$this->requestObject->getQuery()->checkToggle('expand') && !$requestedMultipleIds) {
            if (count($this->entityResponses) === 1) {
                $entityResponse = array_values($this->entityResponses)[0];
                return $entityResponse->getContent();
            } else {
                return null;
            }
        }
        $content = [];
        foreach ($this->entityResponses as $entityId => &$entityResponse) {
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
