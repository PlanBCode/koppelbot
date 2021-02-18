<?php
require_once './engine/core/connectors/basic.php';

/*
    general connector settings
      path   "/path/to/basename.extension"
      parse "json" (todo xml, yaml)

    property connector settings:
      key: "content"
      key: "key"
      key: "content.a.b"
 */

class Connector_file extends BasicConnector
{
    //TODO create directories if required
    protected $path;
    protected $data;
    protected $extension;

    public function __construct(array $settings)
    {
        $this->path = array_get($settings, 'path');
        $this->extension = array_get($settings, 'extension', '*');
    }

    static protected function getConnectorString(array &$settings, string $method, string $entityClass, string $entityId, array &$propertyPath, Query &$query): string
    {
        return array_get($settings, 'path');
    }

    protected function open(connectorRequest &$connectorRequest): ConnectorResponse
    {
        if (!file_exists($this->path)) {// TODO pass an error message?
            if ($connectorRequest->isReadOnly()) {
                return new ConnectorResponse(404);
            } else { // create the file
                $this->data = [];
            }
        } else {
            $parse = $connectorRequest->getFirstPropertyRequest()->getProperty()->getConnectorSetting('parse');
            //TODO lock file
            $fileContent = file_get_contents($this->path);
            if ($parse === 'json') {
                //TODO error if parsing fails
                $this->data = json_decode($fileContent, true);
            } else { //TODO xml, yaml,csv,tsv
                return new ConnectorResponse(500);
            }
        }
        return new ConnectorResponse(200);
    }

    protected function close(connectorRequest &$connectorRequest): ConnectorResponse
    {
        if (!$connectorRequest->isReadOnly()) {
            $parse = $connectorRequest->getFirstPropertyRequest()->getProperty()->getConnectorSetting('parse');
            if ($parse === 'json') {
                $fileContent = json_encode($this->data);
            } else { //TODO xml, yaml,csv,tsv
                return new ConnectorResponse(500);
            }

            if ($fileContent) {
                file_put_contents($this->path, $fileContent);
            }
        }
        //TODO unlock file
        return new ConnectorResponse(200);
    }

    protected function head(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        return new ConnectorResponse();
    }

    protected function getAutoIncrementedId(string $entityId, PropertyRequest& $propertyRequest): ?string
    {
      return null; //TODO for array files
    }
}
