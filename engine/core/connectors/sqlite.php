<?php
/*
- path,
- table

TODO
- INSERT,
- UPDATE
- DELETE
- sort, order, filter
- file doesn't exist -> create
- table doesn't exist -> create
*/

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

    protected function open(): bool
    {
        $this->db = new MyDB($this->path);
        return !!$this->db;
    }

    protected function close()
    {
      if($this->db) $this->db->close();
    }

    public function createResponse(connectorRequest $connectorRequest): ConnectorResponse
    {

        $connectorResponse = new ConnectorResponse();
        if( !$this->open() ) {
          $error = $this->db->lastErrorMsg();
          $connectorResponse->add(500, $propertyRequest, '*', 'Could not retrieve data.' . $error); //TODO check
          return $connectorResponse;
        }
        $method = $connectorRequest->getFirstPropertyRequest()->getMethod();
        if($method !== 'GET') {
          $connectorResponse->add(400, $propertyRequest, '*', 'Method not yet supported'); //TODO add PUT,PATCH,DELETE
          return $connectorResponse;
        }

        $keysPerTable = [];
        $entityIdsPerTable = [];
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
          $propertyPath = $propertyRequest->getPropertyPath();
          $propertyName = $propertyPath[0]; //TODO check

          $entityId = $propertyRequest->getEntityId();
          $connectorSettings = $propertyRequest->getProperty()->getConnectorSettings();
          $table = array_get($connectorSettings, 'table'); //TODO default to entityClassName;
          $key = array_get($connectorSettings, 'key', $propertyName); ;
          if(!array_key_exists($table, $keysPerTable)) {
            $keysPerTable[$table] = [];
            $entityIdsPerTable[$table] = [];
          }
          $keysPerTable[$table][$key] = $propertyRequest;
          $entityIdsPerTable[$table][$entityId] = true;
        }
        foreach($keysPerTable as $table=>$keys){
          $queryString = '';
          $idKey='ID'; //TODO determine id properly /match with $propertyRequest?
          if($method === 'GET'){
            $queryString .= 'SELECT '.$idKey;
            foreach($keys as $key=>$propertyRequest){
              $propertyPath = $propertyRequest->getPropertyPath();
              $propertyName = $propertyPath[0]; //TODO check
              $queryString .= ',' . ($key === $propertyName ? $key : ($key. ' AS '. $propertyName));
            }
            $queryString .=' FROM '.$table;
            $entityIds = $entityIdsPerTable[$table];
            if(!array_key_exists('*',$entityIds)){
              $queryString .=' WHERE '.$idKey.'='. implode(' OR '.$idKey.'=', array_keys($entityIds));
            }
          }          
          //TODO sort, order left join
          $result = $this->db->query($queryString);
          if($result){
            echo json_encode($result);
            while($row = $result->fetchArray()){
              foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
                $propertyPath = $propertyRequest->getPropertyPath();
                $propertyName = $propertyPath[0]; //TODO check
                $entityId = (string)$row[$idKey];
                $connectorResponse->add(200, $propertyRequest, $entityId,  $row[$propertyName]);//TODO determine ID
              }
            }
          }else {
            $error = $this->db->lastErrorMsg();
            $connectorResponse->add(500, $propertyRequest, '*', 'Could not retrieve data.'.$error); //TODO check
          }
        }
        $this->close();
        return $connectorResponse;
    }

    protected function getAutoIncrementedId(string $entityId, PropertyRequest& $propertyRequest): ?string
    {
      $propertyPath = $propertyRequest->getPropertyPath();
      $propertyName = $propertyPath[0]; //TODO check

      $connectorSettings = $propertyRequest->getProperty()->getConnectorSettings();
      $table = array_get($connectorSettings, 'table'); //TODO default to entityClassName?;
      $key = array_get($connectorSettings, 'key', $propertyName); ; //TODO need

      //TOOD do as directory getAutoIncrementedId but track based on both table and entityId
      //TODO open db
      // SELECT max($id) FROM $table + 1
      //close db
      return null; //TODO check db
    }
}
