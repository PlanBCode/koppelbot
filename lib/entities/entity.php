<?
require('./lib/entities/property.php');

/*function array_collect($labelFunction,$array){
    $collection = array();
    foreach($array as $key=>$item){
        $label = $labelFunction($item);
        if(array_key_exists($label,$collection)){
            $collection[$label][$key] = $item;
        }else{
            $collection[$label]=array($item);
        }
    }
    return $collection;
    }*/


/*class EntityClassResponse extends Response {
    protected $entityClass;
    protected $entityResponses = array();

    public function __construct($entityClass){
        $this->entityClass=$entityClass;
    }

    public function add($storageResponse){
        $this->addStatus($storageResponse->getStatus());
        foreach($storageResponse->getEntityResponses() as $entityId=>$entityResponse){
            if(!array_key_exists($entityId,$this->entityResponses)){
                $this->entityResponses[$entityId] = $entityResponse;
            }else{
                $this->entityResponses[$entityId]->merge($entityResponse);
            }
        }
    }

    public function merge($entityClassResponse){
        foreach($entityClassResponse->entityResponses as $entityId=>$entityResponse){
            if(!array_key_exists($entityId , $this->entityResponses)){
                $this->entityResponses[$entityId]=$entityResponse;
            }else{
                $this->entityResponses[$entityId].merge($entityResponse);
            }
        }
    }

    public function getEntityClass(){
        return $this->entityClass;
    }
    public function getEntityResponses(){
        return $this->entityResponses;
    }
    };*/



class Entity {

    protected $properties = array(); // decoded json properties object
    protected $entityClass;

    public function __construct(string $entityClass){
        $this->entityClass=$entityClass;

        //TODO check if file exists
        $fileContent = file_get_contents('./custom/datamodel/'.$entityClass.'.json'); //TODO make safe
        //TODO check if this goes well
        $properties = json_decode($fileContent,true);

        //TODO resolve inheritance

        $rootSettings = array_key_exists('_',$properties)?$properties['_']:array();

        foreach($properties as $property=>$settings){
            if($property!='_'){
                $this->properties[$property] = new Property($property,$settings,$rootSettings);
            }
        }
    }

    public function createStorageRequests($requestId, string $method, string $entityId, string $propertyName, $content, $query){
        $storageRequests = array();
        if($propertyName == '*'){
            $properties = $this->properties;
        }else{
            $properties = array();
            foreach(explode(',',$propertyName) as $p){
                if(array_key_exists($p,$this->properties)){
                    $properties[$p]=$this->properties[$p];
                }else{
                    $properties[$p]=$p;
                }
            }
        }
        foreach($properties as $propertyName => $property){
            $propertyRequest = new PropertyRequest($requestId, $method, $this->entityClass, $entityId, $property, $content, $query);
            $storageString = is_string($property)
                           ?'ERROR'
                           :$property->getStorageString($method/* TODO, $this->entityClass, $entityId, $content, $query */);
            if(!array_key_exists($storageString, $storageRequests)){
                $storageRequests[$storageString] = new StorageRequest();
            }
            $storageRequests[$storageString]->add($propertyRequest);
        }
        return $storageRequests;
    }
};

class EntityResponse extends Response{
    protected $entityId;
    protected $propertyReponses = array();

    public function __construct($entityId){
        $this->entityId = $entityId;
    }

    public function add(int $status, string $propertyName, $content){
        $this->addStatus($status);
        if(!array_key_exists($propertyName,$this->propertyReponses)){
            $this->propertyReponses[$propertyName] = new PropertyResponse($status, $propertyName, $content);//
        }
    }

    public function merge(EntityResponse $entityResponse){
        $this->addStatus($entityResponse->getStatus());
        foreach($entityResponse->propertyReponses as $propertyName=>$propertyReponse){
            $this->propertyReponses[$propertyName]=$propertyReponse; //TODOD check for duplicate responses for propertyName ?
        }
    }

    public function getContent(){
        $content = array();
        foreach($this->propertyReponses as $propertyName=>$propertyReponse){ //TODO use a map
            if($this->status == 207){
                $content[$propertyName] = array("status" => $propertyReponse->getStatus(), "content" => $propertyReponse->getContent());
            }else{
                $content[$propertyName] = $propertyReponse->getContent();
            }
        }
        return $content;
    }
};

class EntityClassResponse extends Response{
    protected $entityClass;
    protected $entityReponses = array();

    public function __construct($entityClass){
        $this->entityClass = $entityClass;
    }

    public function add(int $status, string $entityId, string $propertyName, $content){
        $this->addStatus($status);
        if(!array_key_exists($entityId,$this->entityReponses)){
            $this->entityReponses[$entityId] = new EntityResponse($entityId);
        }
        $this->entityReponses[$entityId]->add($status, $propertyName, $content);
    }


   public function merge(EntityClassResponse $entityClassResponse){
        $this->addStatus($entityClassResponse->getStatus());
        foreach($entityClassResponse->entityReponses as $entityId=>$entityReponse){
            if(!array_key_exists($entityId, $this->entityReponses)){
                $this->entityReponses[$entityId]= $entityReponse;
            }else{
                $this->entityReponses[$entityId]->merge($entityReponse);
            }
        }
    }

    public function getContent(){
        $content = array();
        foreach($this->entityReponses as $entityId=>$entityReponse){ //TODO use a map
            if($this->status == 207){
                $content[$entityId] = array("status" => $entityReponse->getStatus(), "content" => $entityReponse->getContent());
            }else{
                $content[$entityId] = $entityReponse->getContent();
            }
        }
        return $content;
    }
};

?>