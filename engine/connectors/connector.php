<?php
require './engine/connectors/connectorRequest.php';
require './engine/connectors/connectorResponse.php';

abstract class Connector
{
    const CONNECTOR_STRING_ERROR = 'ERROR';

    /** @var Connector[] */
    private static $connectors = []; // string $connectorString -> Connector
    private static $connectorClasses = [];
    static public function getConnectorClass(string $typeName)
    {
        if (array_key_exists($typeName, self::$connectorClasses)) {
            return self::$connectorClasses[$typeName];
        } else {
            // TODO an instance of Type_xxx should not be needed, we only use static functions
            $fileName = './engine/core/connectors/'.$typeName .'/'. $typeName . '.php';
            if (!file_exists($fileName)) {
              $found = false;
              foreach (glob("./custom/*/connectors/" .$typeName .'/' . $typeName . '.php') as $filePath) {
                $fileName = $filePath;
                $found = true;
              }
              if(!$found){
                echo 'ERROR Type ' . $typeName . ' : file does not exist!';
                return null;
              }
            }

            require_once $fileName;

            $connectorClass = 'Connector_' . $typeName;
            if (!class_exists($connectorClass)) {
                echo 'ERROR Connector ' . $typeName . ' : class is not defined!';
                return null;
            }
        }
        /* TODO this does not work without instantiating:
            if (!is_subclass_of($typeClass, 'Connector')) {
             echo 'ERROR Type ' . $typeName . ' : class does not extend Type!';
             return null;
         }*/

        self::$connectorClasses[$typeName] = $connectorClass;
        return $connectorClass;
    }

    /*
        require_once './engine/core/connectors/' . $type . '.php';

        //TODO find the file and load it from there
        $connectorClass = 'Connector_' . $type;
        if (!class_exists($connectorClass)) {
            return self::CONNECTOR_STRING_ERROR;
        }
        //TODO check if $connectorClass extends Connector class

     */

    public static function createErrorResponse(connectorRequest &$connectorRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $connectorResponse->add($propertyRequest->getStatus(), $propertyRequest, $propertyRequest->getEntityIdList(), $propertyRequest->getContent());
        }
        return $connectorResponse;
    }

    public static function addConnector(string $typeName, array &$connectorSettings, RequestObject &$requestObject, string $entityClass, string $entityId, array &$propertyPath): string
    {
        $query = $requestObject->getQuery();
        $method = $requestObject->getMethod();

        $connectorClass = self::getConnectorClass($typeName);

        $connectorString = $typeName . '_' . $connectorClass::getConnectorString($connectorSettings, $method, $entityClass, $entityId, $propertyPath, $query);

        if (!array_key_exists($connectorString, self::$connectors)) {
            self::$connectors[$connectorString] = new $connectorClass($connectorSettings);
        } else {
            // TODO check if the existing connector class matched the requested type
        }

        return $connectorString;
    }

    public static function getConnectorResponse(ConnectorRequest &$connectorRequest): ConnectorResponse
    {
        $propertyRequests = $connectorRequest->getPropertyRequests();
        /** @var PropertyRequest|null $propertyRequest */
        $propertyRequest = array_get($propertyRequests, 0);
        if (!$propertyRequest instanceof PropertyRequest) {
            return Connector::createErrorResponse($connectorRequest);
        }
        $connectorString = $propertyRequest->getConnectorString();

        switch ($connectorString) {
            case self::CONNECTOR_STRING_ERROR:
                return Connector::createErrorResponse($connectorRequest);
            default:
                $connector = Connector::$connectors[$connectorString];
                $remappedAutoIncrementedUris = [];  // for POST request the sub ids need to be replaced with autoincremented ids.
                foreach ($propertyRequests as $propertyRequest){
                  if ($propertyRequest->getMethod() === 'POST') {
                    $entityClassName = $propertyRequest->getEntityClass();
                    $entityIdList = $propertyRequest->getEntityIdList(); // should not be '*'
                    $entityIds = explode(',', $entityIdList);
                    $newEntityIds = [];
                    foreach ($entityIds as $entityId) {
                      $autoIncrementedId = $connector->getAutoIncrementedId($entityId, $propertyRequest);
                      $stubUri = $entityClassName.'/'.$entityId;
                      $remappedUri = $entityClassName.'/'.$autoIncrementedId;
                      $remappedAutoIncrementedUris[$stubUri] = $remappedUri;
                      $newEntityIds[] = $autoIncrementedId;
                    }
                    $entityIdList = implode(',',$newEntityIds);
                    $propertyRequest->setEntityId($entityIdList);
                  }
                }
                //TODO if POST and id then first get autoincrement ids and update these
                $connectorResponse = $connector->createResponse($connectorRequest);
                $connectorResponse->remapAutoIncrementedUris($remappedAutoIncrementedUris);
                return $connectorResponse;
        }
    }

    abstract static protected function getConnectorString(array &$settings, string $method, string $entityClass, string $entityId, array &$propertyPath, Query &$query): string;

    /**
     * TODO
     * @param {ConnectorRequest} $connectorRequest TODO
     * @return {connectorResponse} TODO
     */
    abstract public function createResponse(ConnectorRequest &$connectorRequest): ConnectorResponse;

    abstract protected function getAutoIncrementedId(string $entityId, PropertyRequest& $propertyRequest); //TODO: ?string;
}
