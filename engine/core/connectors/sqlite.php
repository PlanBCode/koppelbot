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

    protected function constructQueryString(string $method, array &$keys, string $idKey, array &$entityIds, string $table): string
    {
      if($method === 'GET'){
        $queryString = 'SELECT '.$idKey;
        foreach($keys as $key=>$propertyRequest){
          $propertyPath = $propertyRequest->getPropertyPath();
          $propertyName = $propertyPath[0]; //TODO check
          $queryString .= ',' . ($key === $propertyName ? $key : ($key. ' AS '. $propertyName));
        }
        $queryString .=' FROM '.$table;
        if(!array_key_exists('*',$entityIds)){
          $queryString .=' WHERE '.$idKey.' IN ('. implode(',',$entityIds).')';
        }
      } else if($method === 'DELETE'){
        $queryString ='DELETE FROM '.$table. ' WHERE '.$idKey.' IN ('. implode(',',$entityIds).')';
      } else if($method === 'HEAD'){
        $queryString ='SELECT '.$idKey.' FROM '.$table. ' WHERE '.$idKey.' IN ('. implode(',',$entityIds).')';
      }
      //TODO PUT/POST ->insert
      // TODO PATCH -> update
      //TODO sort, order left join

      return $queryString;
    }

    protected function handleResults(string $method, string $idKey, &$result, ConnectorRequest &$connectorRequest, ConnectorResponse &$connectorResponse): void
    {
      if(!$result){
        $error = $this->db->lastErrorMsg();
        $connectorResponse->add(500, $propertyRequest, '*', 'Could not retrieve data.'.$error); //TODO check, set entityId?
      }else if($method === 'GET'){
        while($row = $result->fetchArray()){
          foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $propertyPath = $propertyRequest->getPropertyPath();
            $propertyName = $propertyPath[0]; //TODO check
            $entityId = (string)$row[$idKey];
            $connectorResponse->add(200, $propertyRequest, $entityId,  $row[$propertyName]);
          }
        }
      }else if($method === 'HEAD'){
        $foundEntityIds = [];
        while($row = $result->fetchArray()){
          $entityId = (string)$row[$idKey];
          $foundEntityIds[$entityId] = true;
        }
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
          $entityId = $propertyRequest->getEntityId();
          if(array_key_exists($entityId,$foundEntityIds)){
            $connectorResponse->add(200, $propertyRequest, $entityId,  null);
          } else {
            $connectorResponse->add(404, $propertyRequest, $entityId,  null);
          }
        }
      }//TODO DELETE, PATCH, PUT,POST
    }

    public function createResponse(connectorRequest $connectorRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();

        $method = $connectorRequest->getFirstPropertyRequest()->getMethod();
        if($method !== 'GET' && $method !== 'HEAD') { //TODO DELETE,POST,PUT,PATCH
          $connectorResponse->add(400, $connectorRequest->getFirstPropertyRequest(), '*', 'Method not yet supported');
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

        if( !$this->open() ) {
          $error = $this->db->lastErrorMsg();
          $connectorResponse->add(500, $propertyRequest, '*', 'Could not retrieve data.' . $error); //TODO check
          return $connectorResponse;
        }

        foreach($keysPerTable as $table=>$keys){
          $idKey='ID'; //TODO determine id properly /match with $propertyRequest?
          $entityIds = array_keys($entityIdsPerTable[$table]);
          $queryString = $this->constructQueryString($method, $keys, $idKey, $entityIds, $table);
          $result = $this->db->query($queryString);
          $this->handleResults($method, $idKey, $result, $connectorRequest, $connectorResponse);
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
