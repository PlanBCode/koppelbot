<?php

class MyDB extends SQLite3 {
  function __construct(string $fileName) {
     $this->open($fileName);
  }
}

class Connector_sqlite extends Connector
{
    protected $db;
    protected $path;
    public function __construct(array $settings)
    {
        $this->path = array_get($settings, 'path');
    }

    static protected function getConnectorString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        return $method.'_'.array_get($settings, 'path');
    }

    protected function open(connectorRequest &$connectorRequest)
    {
     $connectorRequest->getFirstPropertyRequest();
     $this->db = new MyDB($this->path);
     if(!$this->db) {
       //TODO
        echo $this->db->lastErrorMsg();
     }
    }

    protected function close()
    {
      if($this->db) $this->db->close();
    }

    public function createResponse(connectorRequest $connectorRequest): ConnectorResponse
    {
        $this->open($connectorRequest);
        $connectorResponse = new ConnectorResponse();
        $queryPerTable = [];
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $propertyPath = $propertyRequest->getPropertyPath();
            $propertyName = $propertyPath[0]; //TODO check

            $connectorSettings = $propertyRequest->getProperty()->getConnectorSettings();
            $table = array_get($connectorSettings, 'table'); //TODO default to entityClassName;
            $key = array_get($connectorSettings, 'key', $propertyName); ;
            if(!array_key_exists($table, $queryPerTable)) $queryPerTable[$table] = [];
            $queryPerTable[$table][$key] = $propertyName;
        }
        $queryString = '';
        foreach($queryPerTable as $table=>$query){
          $queryString .='SELECT ';
          $first = true;
          foreach($query as $key=>$propertyName){
            if($first) $first = false;
            else $queryString.= ', ';
            $queryString .= $key. ' AS '. $propertyName;
          }
          $queryString .=' FROM '.$table; //TODO where sort, order left join
          $result = $this->db->query($queryString);
          if($result){
            while($row = $result->fetchArray()){
              //echo serialize($row)."\n";
              $entityContent = [];
              foreach($query as $propertyName){
                  $entityContent[$propertyName] = $row[$propertyName];
              }
              $connectorResponse->add(200, $propertyRequest, $row['id'], $entityContent);//TODO determine ID
            }


          }else{
            //  TODO $connectorResponse->add(400, $propertyRequest, '*', 'ERROR');//TODO
      //        echo $db->lastErrorMsg();

          }
        }



        $this->close();
        return $connectorResponse;
    }

    protected function getAutoIncrementedId(string $entityId): ?string
    {
      return null; //TODO check db
    }
}
