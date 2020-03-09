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
            $fileName = './engine/core/connectors/' . $typeName . '.php'; // TODO or custom/connectors
            if (!file_exists($fileName)) {
                echo 'ERROR Type ' . $typeName . ' : file does not exist!';
                return null;
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

    public
    static function createErrorResponse(connectorRequest $connectorRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $connectorResponse->add($propertyRequest->getStatus(), $propertyRequest, $propertyRequest->getEntityId(), $propertyRequest->getContent());
        }
        return $connectorResponse;
    }

    public
    static function addConnector(string $typeName, array $connectorSettings, RequestObject &$requestObject, string $entityClass, string $entityId, array $propertyPath): string
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

    public
    static function getConnectorResponse(connectorRequest $connectorRequest): connectorResponse
    {
        /** @var PropertyRequest|null $propertyRequest */
        $propertyRequest = array_get($connectorRequest->getPropertyRequests(), 0);
        if (!$propertyRequest instanceof PropertyRequest) {
            return Connector::createErrorResponse($connectorRequest);
        }
        $connectorString = $propertyRequest->getConnectorString();

        switch ($connectorString) {
            case self::CONNECTOR_STRING_ERROR:
                return Connector::createErrorResponse($connectorRequest);
            default:
                return Connector::$connectors[$connectorString]->createResponse($connectorRequest);
        }
    }

    abstract static protected function getConnectorString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string;

    abstract public function createResponse(connectorRequest $connectorRequest): connectorResponse;
}
