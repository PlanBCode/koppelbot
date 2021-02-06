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

    protected function open(connectorRequest &$connectorRequest, ConnectorResponse &$connectorResponse): bool
    {
        $connectorRequest->getFirstPropertyRequest();
        $this->db = new MyDB($this->path);
        if(!$this->db) {
          $error = $this->db->lastErrorMsg();
          $connectorResponse->add(500, $propertyRequest, '*', 'Could not retrieve data.' . $error); //TODO check
          return false;
        } else return true;
    }

    protected function close()
    {
      if($this->db) $this->db->close();
    }

    public function createResponse(connectorRequest $connectorRequest): ConnectorResponse
    {

        $connectorResponse = new ConnectorResponse();
        if( !$this->open($connectorRequest, $connectorResponse) ) return $connectorResponse;
        $keysPerTable = [];
        $entityIdsPerTable = [];
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            if($propertyRequest->getMethod() !== 'GET') {
              $connectorResponse->add(400, $propertyRequest, '*', 'Method not yet supported'); //TODO add PUT,PATCH,DELETE
            }else{
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
        }
        $queryString = '';
        foreach($keysPerTable as $table=>$keys){
          $idKey='ID'; //TODO determine id properly /match with $propertyRequest?
          $queryString .= 'SELECT '.$idKey;
          $first = true;
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
          //TODO sort, order left join
          $result = $this->db->query($queryString);
          if($result){
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

    protected function getAutoIncrementedId(string $entityId): ?string
    {
      return null; //TODO check db
    }
}
