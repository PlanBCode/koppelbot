<?


function getMergedSetting($name,$settings,$rootSettings){
    if(array_key_exists($name,$settings) ){
        return $settings[$name];
    }else if(array_key_exists($name,$rootSettings) ){
        return $rootSettings[$name];
    }else{
        return null;
    }
}

function getSingleSetting($name,$settings,$rootSettings){
    if(array_key_exists($name,$settings) && array_key_exists($name,$rootSettings) ){
        return array_merge($rootSettings[$name],$settings[$name]);
    }else if(array_key_exists($name,$settings) ){
        return $settings[$name];
    }else if(array_key_exists($name,$rootSettings) ){
        return $rootSettings[$name];
    }else{
        return array();
    }
}

class  PropertyRequest{
    protected $requestId;

    protected $method;
    protected $entityClass;
    protected $entityId;
    protected $property;
    protected $content;
    protected $query;

    public function __construct($requestId, string $method,string $entityClass, string $entityId, $property, $content, $query){
        $this->requestId = $requestId;
        $this->method = $method;
        $this->entityId = $entityId;
        $this->entityClass = $entityClass;
        $this->property = $property;
        $this->content = $content;
        $this->query = $query;
    }

    public function getRequestId(){
        return $this->requestId;
    }
    public function getMethod(){
        return $this->method;
    }
    public function getEntityId(){
        return $this->entityId;
    }
    public function getEntityClass(){
        return $this->entityClass;
    }
    public function getProperty(){
        return $this->property;
    }
    public function getContent(){
        return $this->content;
    }
    public function getQuery(){
        return $this->query;
    }

};

class PropertyResponse extends Response{
    protected $content;

    public function __construct(int $status, string $propertyName, $content = NULL){
        $this->addStatus($status);
        $this->content = $content;
    }

    public function getContent(){
        return $this->content;
    }
}

class Property {
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

    public function __construct(string $propertyName,$settings,$rootSettings){
        $this->propertyName = $propertyName;
        $this->settings = $settings;

        $this->type = getSingleSetting('type',$settings,$rootSettings);
        $this->storage = getMergedSetting('storage',$settings,$rootSettings);
        $this->access = getMergedSetting('access',$settings,$rootSettings);

        if(array_key_exists('storage',$settings) && array_key_exists('storage',$rootSettings) ){
            $this->storage = array_merge($rootSettings['storage'],$settings['storage']);
        }else if(array_key_exists('storage',$settings) ){
            $this->storage = $settings['storage'];
        }else if(array_key_exists('storage',$rootSettings) ){
            $this->storage = $rootSettings['storage'];
        }else{
            $this->storage = array();
            //TODO 500 error
        }

        if(array_key_exists('type',$this->storage)){
            $type = $this->storage['type'];
        }else{
            //TODO 500 error
        }

        //TODO setupAccess  -> 403

        $storageClass = 'Storage_'.$type;
        if(class_exists($storageClass)){
            $this->storageString = $type.'_'.$storageClass::getStorageString($this->storage);
            if(!array_key_exists($this->storageString,Storage::$storages)){
                Storage::$storages[$this->storageString] = new $storageClass($this->storage);
            }else{
                // TODO check if the existing storage class matched the requested type
            }
        }else{
            //TODO 500 error
        }
    }

    public function getName(){
        return $this->propertyName;
    }

    public function getStorageString(){
        return $this->storageString;
    }

    public function getStorageSetting($settingName){
        if(array_key_exists($settingName,$this->storage)){
            return $this->storage[$settingName];//TODO check if exists
        }else{
            return null;
        }
    }

};


?>