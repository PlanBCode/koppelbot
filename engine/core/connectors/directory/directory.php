<?php
require_once './engine/core/connectors/basic.php';

/*
    general connector settings
      path        "/path/to/directory/"
      extension    "json"|"*"
      basename    "filename.json" (use the parent dir as entityId
      parse "json" (todo xml, yaml)

    property connector settings:
      key: "key" -> default for index type
      key: "content"
      key: "basename"
      key: "filename"
      key: "path"
      key: "extension"
      key: "size"
      key: "mime"
      key: "content.a.b"

   TODO modified/created = timestamps
TODO include hidden
TODO include directories
TODO recursive
 */

class Connector_directory extends BasicConnector
{


    protected $paths;  // : separated paths
    protected $extension;
    protected $basename;
    protected $data;
    protected $meta;
    protected $settings;

    protected $maxAutoIncrementedId;
    protected $autoIncrementLookup = [];

    public function __construct(array &$settings)
    {
        // TODO create directories if required
        $this->paths = explode(':', array_get($settings, 'path'));
        $this->extension = array_get($settings, 'extension', '*');
        $this->basename = array_get($settings, 'basename');
        $this->settings = $settings;
    }

    protected function createFilePath(string $entityId, string $path = null)
    {
        if(is_null($this->basename)){
          if (is_null($path)) $path = $this->paths[0]; //TODO check if length >0
          return $path . $entityId . ($this->extension != '*' ? ('.' . $this->extension) : ''); //TODO join paths properly
        } else {
          foreach($this->paths as $path){
            $dirPath = implode('/',array_slice(explode('/',$path),0,-2));//TODO join paths properly
            $filePath = $dirPath. '/'. $entityId .'/'. $this->basename; //TODO join paths properly
            if(file_exists($filePath)) return $filePath;
          }
          $dirPath = implode('/',array_slice(explode('/',$this->paths[0]),0,-2));//TODO join paths properly
          $filePath = $dirPath. '/'. $entityId .'/'. $this->basename; //TODO join paths properly
          return $filePath;
        }
    }

    static protected function getConnectorString(array &$settings, string $method, string $entityClass, string $entityId, array &$propertyPath, Query &$query): string
    {
        $path = array_get($settings, 'path');
        if(array_key_exists('basename',$settings)){
          return $path . '*.' . array_get($settings,'basename');
        }else{
          $extension = array_get($settings, 'extension', '*');
          return $path . '*.' . $extension;
        }
    }

    protected function getAllEntityIds(): array
    {
        $entityIds = [];
        if(is_null($this->basename)){
          foreach ($this->paths as $path) {
              foreach (glob($this->createFilePath('*', $path)) as $filePath) {// TODO use glob('{a,b}', GLOB_BRACE)
                  if (!is_dir($filePath)) {
                      $entityId = $this->extension === '*' ? basename($filePath) : basename($filePath, '.' . $this->extension);
                      $entityIds[$entityId] = $filePath;
                  }
              }
          }
        } else {
          foreach ($this->paths as $path) {
            foreach (glob($path) as $dirPath) {// TODO use glob('{a,b}', GLOB_BRACE)
              $filePath = $dirPath.$this->basename;
              if(is_dir($dirPath) && file_exists($filePath) && !is_dir($filePath)){
                $entityId = explode('/',$dirPath)[1]; // 'custom/$entityId' -> '$entityId'
                $entityIds[$entityId] = $filePath;
              }
            }
          }
        }
        return $entityIds;
    }

    protected function getAutoIncrementedId(string $entityId, PropertyRequest& $propertyRequest)//TODO: ?string
    {
        if (array_key_exists($entityId, $this->autoIncrementLookup)) {
            return $this->autoIncrementLookup[$entityId];
        }
        if (empty($this->autoIncrementLookup)) {
            //TODO error if extension === '*'  no way to decide then
            $allExistingEntityIds = array_keys($this->getAllEntityIds());
            if (empty($allExistingEntityIds)) {
                $this->maxAutoIncrementedId = 0;
            } else {
                $integerEntityIds = array_map('intval', $allExistingEntityIds);
                $this->maxAutoIncrementedId = max($integerEntityIds) + 1;
            }
        } else {
            $this->maxAutoIncrementedId++;
        }
        $max = strval($this->maxAutoIncrementedId);
        $this->autoIncrementLookup[$entityId] = $max;
        return $max;
    }

    protected function open(connectorRequest &$connectorRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        //TODO loop through property requests only if other property than id, or timestamp is requested then open the file
        $propertyRequest = $connectorRequest->getFirstPropertyRequest();
        $this->data = [];
        $this->meta = [];
        $entityIds = [];
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $entityIdList = $propertyRequest->getEntityIdList();

            if ($propertyRequest->isEntityCreation()) {
              // do nothing. No file yet to write to, this file will be created
            } else if ($entityIdList === '*') {
                $entityIds = $this->getAllEntityIds();
                break;
            } else {
                //TODO BASENAME!
                $moreEntityIds = explode(',', $entityIdList);
                foreach ($moreEntityIds as $entityId) {
                    $paths = array_map(function ($path) use ($entityId) {
                        return $this->createFilePath($entityId, $path);
                    }, $this->paths);
                    $filePaths = glob('{' . implode(',', $paths) . '}', GLOB_BRACE);
                    if (count($filePaths) === 0) {
                        $content = 'Not found';
                        $connectorResponse->add(404, $propertyRequest, $entityId, $content);
                    } else {
                        $filePath = $filePaths[0];
                        $entityIds[$entityId] = $filePath;
                    }
                }
            }
        }
        $parse = $propertyRequest->getProperty()->getConnectorSetting('parse', 'none');
        foreach ($entityIds as $entityId => $filePath) {
            //TODO lock file
            $fileContent = file_get_contents($filePath);
            //TODO error if fails
            if ($parse === 'json') {
                $this->data[$entityId] = json_decode($fileContent, true);
            } else { //TODO xml,yaml,csv,tsv
                $this->data[$entityId] = $fileContent;
            }
            if (!array_key_exists($entityId, $this->meta)) $this->meta[$entityId] = [];
            $this->meta[$entityId]['extension'] = pathinfo($filePath, PATHINFO_EXTENSION);
            $this->meta[$entityId]['mime'] = mime_content_type($filePath);
            $this->meta[$entityId]['size'] = filesize($filePath);
            $this->meta[$entityId]['path'] = $filePath;
            //TODO creation timestamp, modification timestamp
        }
        return $connectorResponse;
    }

    protected function close(ConnectorRequest &$connectorRequest): ConnectorResponse
    {
        $propertyRequest = $connectorRequest->getFirstPropertyRequest();

        if (!$propertyRequest) {
            return new ConnectorResponse(500);
        }
        $parse = $propertyRequest->getProperty()->getConnectorSetting('parse', 'none');

        foreach ($this->data as $entityId => $data) {
            if (!$connectorRequest->isReadOnly($entityId) || !is_null($this->maxAutoIncrementedId)) {
                if ($parse === 'json') {
                    $fileContent = json_encode($data);
                } else {//TODO xml,yaml,csv,tsv
                    $fileContent = $data;
                }
                if ($fileContent) {

                    $filePath = $this->meta[$entityId]['path']
                      ? $this->meta[$entityId]['path']
                      : $this->createFilePath($entityId);

                    $path = dirname($filePath);
                    if(!is_dir($path)){
                      $success = mkdir($path, 0777, true);
                      //TODO error if no success
                    }
                    file_put_contents($filePath, $fileContent);
                }
            }
            //TODO unlock file
        }
        // check for deleted files
        foreach ($this->meta as $entityId => $meta) {
            if (!array_key_exists($entityId, $this->data)) unlink($this->meta[$entityId]['path']);
        }

        return new ConnectorResponse(200);
    }

    protected function head(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        //TODO
        return new ConnectorResponse();
    }
}
