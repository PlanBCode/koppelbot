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

class Connector_sqlite extends Connector
{
    protected $db;
    protected $path;
    public function __construct(array $settings) //TODO &
    {
        $this->path = array_get($settings, 'path');
    }

    //TODO &
    static protected function getConnectorString(array &$settings, string $method, string $entityClass, string $entityId, array &$propertyPath, Query &$query): string
    {
        return $method.'_'.array_get($settings, 'path').'_'.$entityClass;
    }

    protected function open(): bool
    {
        $this->db = new SQLite3($this->path);
        return !!$this->db;
    }

    protected function close()
    {
      if($this->db) $this->db->close();
    }

    protected function constructQueryString(string $method, array &$keys, string $idPropertyName, string $idKey, EntityClass &$entityClass, array &$entityIds, string $table, bool $useFilters, Query &$query): string
    {
      $query = array_values($keys)[0]->getQuery();

      if($method === 'GET'){
        $queryString = 'SELECT '.$idKey;
        foreach($keys as $key=>$propertyRequest){
          $propertyPath = $propertyRequest->getPropertyPath();
          $propertyName = $propertyPath[0]; //TODO check
          $queryString .= ', ';
          if(strpos($key,'.')!== false){
            $keyPath = explode('.',$key);
            $baseKey = $keyPath[0];
            $subKeyPath = array_slice($keyPath,1);
            $subKey = implode('.',$subKeyPath);
            $queryString .= 'json_extract('.$baseKey.', \'$.'.$subKey.'\') AS '.$propertyName;
          }else{
            $queryString .= ($key === $propertyName ? $key : ($key. ' AS '. $propertyName));
          }

        }

        $whereString = array_key_exists('*',$entityIds) ? '' : (' WHERE '.$idKey.' IN (\''. implode('\',\'',array_keys($entityIds)).'\')');

        $filterString = '';
        foreach ($query->getFilters() as &$queryFilter) {
          $x = $queryFilter;
          $lhs = $x[0];
          $operator = $x[1];
          $rhs = $x[2];
          $lhsPropertyPath = [$lhs];
          if($entityClass->hasProperty($lhsPropertyPath)){
            $property = $entityClass->getProperty($lhsPropertyPath);
            $typeName = $property->getTypeName();
            $a = '';
            if($typeName === 'id' || $typeName === 'number' || $typeName === 'reference'){
              if($operator === '==='){
                $a = $lhs .'='.$rhs.'';//TODO check
              }else if($operator === '==' && $rhs!=='*'){
                $a = $lhs .' IN (\''. implode("','",explode(',',$rhs)).'\')';//TODO check
              }else if($operator === '!='){
                $a = $rhs === '*'
                  ? 'FALSE'
                  : 'NOT '. $lhs .' IN (\''.  $rhs.'\')';//TODO check
              } else if($operator === '!=='){
                $a = $lhs .'<>'.$rhs.'';//TODO check
              } else if($operator === '>=' || $operator === '<=' || $operator === '<' || $operator === '>'){
                $a = $lhs .'='.$rhs.'';//TODO check
              }
            }else if($typeName === 'string'){
              if($operator === '=='){ //TODO ===
                $a = $lhs .'="'.$rhs.'"';//TODO check
              } else if($operator === '!='){ //TODO !==
                $a = $lhs .'<>"'.$rhs.'"';//TODO check
              }
            }else if($typeName === 'geojson'){
              if($operator === '>=<'){
                $bbox = explode(',',$rhs);
                $xMin = $bbox[0];//TODO intval
                $yMin = $bbox[1];//TODO intval
                $xMax = $bbox[2];//TODO intval
                $yMax = $bbox[3];//TODO intval
                $a = "
                  ( $xMin <= json_extract(geojson, '\$.bbox[2]')
                    AND $yMin <= json_extract(geojson, '\$.bbox[3]')
                    AND $xMax >= json_extract(geojson, '\$.bbox[0]')
                    AND $yMax >= json_extract(geojson, '\$.bbox[1]')
                  )";//TODO check
              }
            }
            if($a !== '') $filterString .= ($filterString===''?'':' AND') . ' '.$a;
          }
        }
        if($filterString !== ''){
          if($whereString !== '') $whereString .= ' AND '.$filterString;
          else $whereString = ' WHERE '.$filterString;
        }

        $queryString .=' FROM '.$table . $whereString;

        //if( $useFilters) {
          if( $query->hasOption('limit')) $queryString.=' LIMIT ' . intval($query->getOption('limit'));
          else $queryString.=' LIMIT -1';
          if( $query->hasOption('xoffset')) $queryString.=' OFFSET ' . intval($query->getOption('xoffset')); // note not offset
        //}

      } else if($method === 'DELETE'){
        $queryString ='DELETE FROM '.$table. $whereString;
      } else if($method === 'HEAD'){
        $queryString ='SELECT '.$idKey.' FROM '.$table. $whereString;
      }
      //TODO PUT/POST ->insert
      // TODO PATCH -> update
      //TODO sort, order left join
      return $queryString;
    }

    protected function handleResults(string $method, string $idKey, &$result, PropertyRequest &$propertyRequest, ConnectorRequest &$connectorRequest, ConnectorResponse &$connectorResponse)//TODO : void
    {
      if(!$result){
        $error = $this->db->lastErrorMsg();
        $content = 'Could not retrieve data.'.$error;
        $propertyRequest = $connectorRequest->getFirstPropertyRequest();
        $connectorResponse->add(500, $propertyRequest, '*', $content);
      }else if($method === 'GET'){
        while($row = $result->fetchArray()){
          foreach ($connectorRequest->getPropertyRequests() as &$propertyRequest) {
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
          $entityIdList = $propertyRequest->getEntityIdList();
          $entityIds = explode(',', $entityIdList);
          if(count(array_intersect($entityId,$foundEntityIds))>0){ //TODO performance
            $connectorResponse->add(200, $propertyRequest, $entityId,  null);
          } else {
            $connectorResponse->add(404, $propertyRequest, $entityId,  null);
          }
        }
      }else{//TODO DELETE, PATCH, PUT,POST
        $content = 'Method not yet supported';
        $connectorResponse->add(500, $propertyRequest, '*', $content);
      }
    }

    public function createResponse(connectorRequest &$connectorRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();

        $method = $connectorRequest->getFirstPropertyRequest()->getMethod();
        if($method !== 'GET' && $method !== 'HEAD') { //TODO DELETE,POST,PUT,PATCH
          $content = 'Method not yet supported';
          $connectorResponse->add(400, $connectorRequest->getFirstPropertyRequest(), '*', $content);
          return $connectorResponse;
        }


        // $table => $requestId => $key => $property
        $keysPerTablePerRequestId = [];
        // $table => $requestId => $entityId => true
        $entityIdsPerTablePerRequestId = [];
        // $table => $requestId  => true|false
        $allowFilterAtConnectorPerTablePerRequestId = []; // if no external data is used for filter, we can do it in SQL
        // $table => $idProperty
        $entityClassPerTable = [];

        foreach ($connectorRequest->getPropertyRequests() as &$propertyRequest) {
          $propertyPath = $propertyRequest->getPropertyPath();
          $propertyName = $propertyPath[0]; //TODO check

          $entityIdList = $propertyRequest->getEntityIdList();
          $entityIds = explode(',',$entityIdList);
          $requestId = $propertyRequest->getRequestId();

          $connectorSettings = $propertyRequest->getProperty()->getConnectorSettings();
          $table = array_get($connectorSettings, 'table'); //TODO default to entityClassName;
          $key = array_get($connectorSettings, 'key', $propertyName); ;
          if(!array_key_exists($table, $keysPerTablePerRequestId)) {
            $keysPerTablePerRequestId[$table] = [];
            $entityIdsPerTablePerRequestId[$table] = [];
            $allowFilterAtConnectorPerTablePerRequestId[$table] = [];
          }
          if(!array_key_exists($requestId, $keysPerTablePerRequestId[$table])) {
            $keysPerTablePerRequestId[$table][$requestId] = [];
            $entityIdsPerTablePerRequestId[$table][$requestId] = [];
            $allowFilterAtConnectorPerTablePerRequestId[$table][$requestId] = true;
          }

          // If no propertyNames are used by query then we can implement the requested limit and offset
          // TODO check if only already used propertyNames in this table are used, then it's also ok
          if(count($propertyRequest->getQuery()->getAllUsedPropertyNames())){
            $allowFilterAtConnectorPerTablePerRequestId[$table][$requestId] = false;
          }

          $keysPerTablePerRequestId[$table][$requestId][$key] = $propertyRequest;
          $entityClassName = $propertyRequest->getEntityClassName();
          $accessGroups = [];
          $entityClass = EntityClass::get($entityClassName,$accessGroups);
          $entityClassPerTable[$table] = $entityClass;

          foreach($entityIds as $entityId){
            $entityIdsPerTablePerRequestId[$table][$requestId][$entityId] = true;
          }
        }

        if( !$this->open() ) {
          $error = $this->db->lastErrorMsg();
          $content = 'Could not retrieve data.' . $error;
          $connectorResponse->add(500, $propertyRequest, '*', $content); //TODO check
          return $connectorResponse;
        }

        foreach($keysPerTablePerRequestId as $table => &$keysPerRequestId){
          foreach($keysPerRequestId as $requestId => &$keys){
            $entityClass=$entityClassPerTable[$table];
            $entityIds = $entityIdsPerTablePerRequestId[$table][$requestId];

            $idPropertyName = $entityClass->getIdPropertyName();
            $idPropertyPath = [$idPropertyName];
            $idProperty = $entityClass->getProperty($idPropertyPath);
            $idKey = $idProperty->getConnectorSetting('key', $idPropertyName);
            $query = $propertyRequest->getQuery();
            $queryString = $this->constructQueryString($method, $keys, $idPropertyName, $idKey, $entityClass, $entityIds, $table, $allowFilterAtConnectorPerTablePerRequestId[$table][$requestId], $query);

            $result = $this->db->query($queryString);
            $this->handleResults($method, $idKey, $result, $propertyRequest, $connectorRequest, $connectorResponse);
          }
        }
        $this->close();
        return $connectorResponse;
    }

    protected function getAutoIncrementedId(string $entityId, PropertyRequest& $propertyRequest)//TODO: ?string
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
