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

class Storage_file extends BasicConnector
{
    //TODO create directories if required


    protected $path;
    protected $data;

    public function __construct(array $settings)
    {
        $this->path = array_get($settings, 'path');
    }

    static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        return array_get($settings, 'path');
    }

    protected function open(connectorRequest $connectorRequest): connectorResponse
    {
        if (!file_exists($this->path)) {// TODO pass an error message?
            if ($connectorRequest->isReadOnly()) {
                return new connectorResponse(404);
            } else { // create the file
                $this->data = [];
            }
        } else {
            $parse = $connectorRequest->getFirstPropertyRequest()->getProperty()->getStorageSetting('parse');
            //TODO lock file
            $fileContent = file_get_contents($this->path);
            if ($parse === 'json') {
                //TODO error if parsing fails
                $this->data = json_decode($fileContent, true);
            } else { //TODO xml, yaml,csv,tsv
                return new connectorResponse(500);
            }
        }
        return new connectorResponse(200);
    }

    protected function close(connectorRequest $connectorRequest): connectorResponse
    {
        if (!$connectorRequest->isReadOnly()) {
            $parse = $connectorRequest->getFirstPropertyRequest()->getProperty()->getStorageSetting('parse');
            if ($parse === 'json') {
                $fileContent = json_encode($this->data);
            } else { //TODO xml, yaml,csv,tsv
                return new connectorResponse(500);
            }

            if ($fileContent) {
                file_put_contents($this->path, $fileContent);
            }
        }
        //TODO unlock file
        return new connectorResponse(200);
    }

    protected function head(PropertyRequest $propertyRequest): connectorResponse
    {
        return new connectorResponse();
    }
}
