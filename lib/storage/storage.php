<?
/*

  if for multiple properties storage json is the same except for property then offer them merged to Storage

 */

class StorageRequest{
    protected $propertyRequests = array();

    public function add($properyRequest){
        $this->propertyRequests[] = $properyRequest;
    }

    public function merge($storageRequest){
        $this->propertyRequests->push(...$storageRequest->propertyRequests);
    }

    public function getPropertyRequests(){
        return $this->propertyRequests;
    }
};

class StorageResponse extends Response {
    protected $requestResponses = array();

    public function __construct(int $status=200){
        $this->addStatus($status);
    }

    public function add(int $status, PropertyRequest $propertyRequest, string $entityId, string $propertyName, $content ){
        $this->addStatus($status);
        $requestId = $propertyRequest->getRequestId();
        if(!array_key_exists($requestId,$this->requestResponses)){
            $this->requestResponses[$requestId] = new RequestResponse($requestId);
        }
        $this->requestResponses[$requestId]->add($status, $propertyRequest->getEntityClass(), $entityId, $propertyName, $content);
    }

    public function merge(StorageResponse $storageResponse){
        $this->addStatus($storageResponse->getStatus());
        foreach($storageResponse->requestResponses as $requestId=>$requestResponse){
            if(!array_key_exists($requestId,$this->requestResponses)){
                $this->requestResponses[$requestId] = $requestResponse;
            }else{
                $this->requestResponses[$requestId]->merge($requestResponse);
            }
        }
    }

    public function getRequestResponses(){
        return $this->requestResponses;
    }
};

abstract class Storage {
    public static $storages = array(); // string $storageString -> Storage
    public static function createErrorResponse($storageRequest){
        $storageResponse = new StorageResponse();
        foreach($storageRequest->getPropertyRequests() as $propertyRequest){
            $propertyName = $propertyRequest->getProperty();
            $storageResponse->add(404, $propertyRequest, $propertyRequest->getEntityId(), 'error', 'Property '.$propertyName.' not found for '.$propertyRequest->getEntityClass());//TODO
        }
        return $storageResponse;
    }
    abstract static public function getStorageString($settings/*, $method, $entityClass, $entityId, $content, $query*/);//TODO

    abstract public function createReponse($storageRequest);
};


abstract class BasicStorage extends Storage {
    public static $storages = array(); // string $storageString -> Storage

    public function createReponse($storageRequest){
        $storageResponse = $this->open($storageRequest);
        foreach($storageRequest->getPropertyRequests() as $propertyRequest){
            $storageResponse->merge($this->createPropertyResponse($propertyRequest));
        }
        $storageResponse->merge($this->close($storageRequest));
        return $storageResponse;
    }


    protected function createPropertyResponse($propertyRequest){
        switch($propertyRequest->getMethod()){
        case 'GET': return $this->get($propertyRequest);
        case 'PUT': return $this->put($propertyRequest);
        case 'HEAD': return $this->head($propertyRequest);
        case 'DELETE': return $this->delete($propertyRequest);
        default: //TODO error
        }
    }

    abstract protected function open($storageRequest);
    abstract protected function close($storageRequest);

    abstract protected function get($propertyRequest);
    abstract protected function put($propertyRequest);
    abstract protected function head($propertyRequest);
    abstract protected function delete($propertyRequest);
};

class Storage_file extends BasicStorage { //TODO in separate file, separate folder (not lib)
    /*
    create directories if required

      parse
      path
      property

     */
    protected $path;
    protected $data;

    public function __construct($settings){
        $this->path = $settings['path']; //TODO check if available
    }

    static public function getStorageString($settings/*, $method, $entityClass, $entityId, $content, $query*/){
        return $settings['path']; //TODO check if available
    }

    protected function open($storageRequest){
        //TODO lock file
        // TODO check if file exists
        $fileContent = file_get_contents($this->path);
        //TODO error if fails
        $this->data = json_decode($fileContent,true);
        return new StorageResponse(200);
    }

    protected function close($storageRequest){
        $fileContent = json_encode($this->data);
        if($fileContent){
            file_put_contents($this->path, $fileContent);//TODO only on write
        }
        //TODO unlock file
        return new StorageResponse(200);
    }

    protected function get($propertyRequest){
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList=='*'
                   ? array_keys($this->data)
                   : explode(',',$entityIdList);
        $requestId = $propertyRequest->getRequestId();

        //Loop through enityIds and add properties
        foreach($entityIds as $entityId){
            if(array_key_exists($entityId, $this->data)){
                $entity = $this->data[$entityId];
                $property = $propertyRequest->getProperty();
                $propertyName = $property->getName();
                if($propertyRequest->getProperty()->getStorageSetting('key')){
                    $content = $entityId;
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content );
                }else if(array_key_exists($propertyName, $entity)){
                    $content = $entity[$propertyName];
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content );
                }else{
                    $storageResponse->add(404, $propertyRequest, $entityId, $propertyName, 'Not found');//TODO pass something
                }
            }else{
                $storageResponse->add(404, $propertyRequest, $entityId, '*', 'Not found');//TODO
            }
        }

        return $storageResponse;
    }

      protected function put($propertyRequest){
        $storageResponse = new StorageResponse();
        $entityIdList = $propertyRequest->getEntityId();
        $entityIds = $entityIdList=='*'
                   ? array_keys($this->data)
                   : explode(',',$entityIdList);
        $requestId = $propertyRequest->getRequestId();

        //Loop through enityIds and add properties
        foreach($entityIds as $entityId){
            if(array_key_exists($entityId, $this->data)){
                $entity = $this->data[$entityId];
                $property = $propertyRequest->getProperty();
                $propertyName = $property->getName();
                if($propertyRequest->getProperty()->getStorageSetting('key')){
                    $content = $propertyRequest->getContent();
                    $this->data[$content] = $this->data[$entityId];
                    unset($this->data[$entityId]);
                }else if(array_key_exists($propertyName, $entity)){
                    $content = $propertyRequest->getContent();
                    $this->data[$entityId][$propertyName] = $content;
                    $storageResponse->add(200, $propertyRequest, $entityId, $propertyName, $content );
                }else{
                    $storageResponse->add(404, $propertyRequest, $entityId, $propertyName, 'Not found');//TODO pass something
                }
            }else{
                $storageResponse->add(404, $propertyRequest, $entityId, '*', 'Not found');//TODO
            }
        }

        return $storageResponse;
    }


    protected function head($propertyRequest){}
    protected function delete($propertyRequest){}
};

/*

  TODO

class Storage_multifile extends Storage
class Storage_directory extends Storage



class MySqlStorage extends Storage {
 credentials?
 create db's tables  if required

      db
      table
      index
      property = column

    public function __construct($json){

    }

 */

?>