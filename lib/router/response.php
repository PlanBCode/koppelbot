<?
class Response {
    protected $status;

    protected function addStatus(int $status){
        if(isset($this->status)){
            if($this->status != $status){
                $this->status = 207; //TODO no magic number
            }
        }else{
            $this->status = $status;
        }
    }

    public function getStatus(){
        return $this->status;
    }
};


class RequestResponse extends Response{
    protected $requestId;
    protected $entityClassReponses = array();

    public function __construct($requestId){
        $this->requestId = $requestId;
    }

    public function add(int $status, string $entityClass, string $entityId, string $propertyName, $content){
        $this->addStatus($status);
        if(!array_key_exists($entityClass,$this->entityClassReponses)){
            $this->entityClassReponses[$entityClass] = new EntityClassResponse($entityClass);
        }
        $this->entityClassReponses[$entityClass]->add($status,  $entityId, $propertyName, $content);
    }

    public function merge(RequestResponse $requestResponse){
        $this->addStatus($requestResponse->getStatus());
        foreach($requestResponse->entityClassReponses as $entityClass=>$entityClassReponse){
            if(!array_key_exists($entityClass, $this->entityClassReponses)){
                $this->entityClassReponses[$entityClass]= $entityClassReponse;
            }else{
                $this->entityClassReponses[$entityClass]->merge($entityClassReponse);
            }
        }
    }

    public function getContent(){
        $content = array();
        foreach($this->entityClassReponses as $entityClass=>$entityClassReponse){ //TODO use a map
            if($this->status == 207){
                $content[$entityClass] = array("status" => $entityClassReponse->getStatus(), "content" => $entityClassReponse->getContent());
            }else{
                $content[$entityClass] = $entityClassReponse->getContent();
            }
        }
        return $content;
    }
};

class HttpResponse extends Response{
    protected $headers;
    protected $content;

    public function __construct(int $status, $content, $headers = array()){
        $this->status = $status;
        $this->content = $content;
        $this->headers = $headers;
    }

    private function setHeaders(){
        foreach($this->headers as $key=>$value){
            header($key.': '.$value);
        }
    }
    private function setStatus(){
        http_response_code($this->status);
    }

    private function setContent(){
        echo $this->content;
    }

    public function echo(){
        $this->setHeaders();
        $this->setStatus();
        $this->setContent();
    }
};

class ApiResponse extends HttpResponse{
    public function __construct(string $method,$requestResponses){
        $count = count($requestResponses);
        if($count == 0){
            parent::__construct(400,'Request was empty',array());
        }else if($method!='POST'){
            $requestResponse = array_values($requestResponses)[0];
            $data = $requestResponse->getContent();
            parent::__construct($requestResponse->getStatus(),json_encode($data),array());
        }else{
            $data = array();
            foreach($requestResponses as $requestId=>$requestResponse){
                $this->addStatus($requestResponse->getStatus());
                $data[$requestId] = array(status => $requestResponse->getStatus(), result => $requestResponse->getContent());
            }
            parent::__construct($this->status,json_encode($data),array());
        }
    }
};

class ContentResponse extends HttpResponse{
    public function __construct($uri){
        if($uri=='/'){
            if(file_exists('custom/content/index.html') ){
                $fileContent = file_get_contents('custom/content/index.html');
                parent::__construct(200,$fileContent,array());
            }else{
                parent::__construct(200,'Hello World',array());
            }
        }else if($uri=='/script.js'){
            $fileContent = file_get_contents('lib/front-end/script.js');
            parent::__construct(200,$fileContent,array());
        }else if(file_exists('custom/content'.$uri) ){
            $fileContent = file_get_contents('custom/content'.$uri);//TODO make safe!
            parent::__construct(200,$fileContent,array());
        }else if(file_exists('custom/errors/404.html') ){
            $fileContent = file_get_contents('custom/errors/404.html');
            parent::__construct(404,$fileContent,array());
        }else{
            parent::__construct(404,'Page Not Found',array());//TODO use (default) error page
        }
    }
}

?>