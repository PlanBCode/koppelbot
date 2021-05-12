<?php

class Response
{
    /** @var int */
    protected $status;

    protected function addStatus(int $status)//TODO : void
    {
        if (isset($this->status)) {
            if ($this->status != $status) {
                $this->status = 207; //TODO no magic number
            }
        } else {
            $this->status = $status;
        }
    }

    public function getStatus(): int
    {
        return isset($this->status) ? $this->status : 200;
    }
}

class RequestResponse extends Response
{
    /** @var RequestObject */
    protected $requestObject;

    /** @var EntityClassResponse[] */
    protected $entityClassResponses = [];

    /** @var string[] */
    protected $remappedAutoIncrementedUris = [];

    public function __construct(RequestObject &$requestObject, array &$remappedAutoIncrementedUris)
    {
        $this->requestObject = $requestObject;
        $this->remappedAutoIncrementedUris += $remappedAutoIncrementedUris;
    }

    public function add(int $status, string $entityClassName, string $entityId, array &$propertyPath, &$content, array &$remappedAutoIncrementedUris)//TODO : void
    {
        $this->addStatus($status);
        if (!array_key_exists($entityClassName, $this->entityClassResponses)) {
            $this->entityClassResponses[$entityClassName] = new EntityClassResponse($entityClassName, $this->requestObject);
        }
        $this->remappedAutoIncrementedUris += $remappedAutoIncrementedUris;
        $this->entityClassResponses[$entityClassName]->add($status, $entityId, $propertyPath, $content);
    }

    public function merge(RequestResponse &$requestResponse)//TODO : void
    {
        $this->remappedAutoIncrementedUris += $requestResponse->remappedAutoIncrementedUris;
        $this->addStatus($requestResponse->getStatus());
        foreach ($requestResponse->entityClassResponses as $entityClass => $entityClassResponse) {
            if (!array_key_exists($entityClass, $this->entityClassResponses)) {
                $this->entityClassResponses[$entityClass] = $entityClassResponse;
            } else {
                $this->entityClassResponses[$entityClass]->merge($entityClassResponse);
            }
        }
    }

    public function getRemappedAutoIncrementedUri(string &$stubUri) //TODO : ?string
    {
      return array_get($this->remappedAutoIncrementedUris, $stubUri, null);
    }

    public function getRemappedAutoIncrementedUris(): array
    {
      return $this->remappedAutoIncrementedUris;
    }

    public function addRemappedAutoIncrementedUris(array &$remappedAutoIncrementedUris)//TODO : void
    {
      $this->remappedAutoIncrementedUris += $remappedAutoIncrementedUris;
    }

    public function getEntityClassResponses(): array
    {
        return $this->entityClassResponses;
    }

    public function getContent()
    {
        $count = count($this->entityClassResponses);
        //TOOD $limit = $this->requestObject->getQuery()->getOption('limit');
        if (!$this->requestObject->getQuery()->checkToggle('expand') && $count <= 1) {
            if ($count === 1) {
                $entityClassResponse =& array_values($this->entityClassResponses)[0];
                return $entityClassResponse->getContent();
            } else {
                return null;
            }
        }

        $content = [];
        foreach ($this->entityClassResponses as $entityClass => &$entityClassResponse) {
            if ($this->status == 207) {
                $content[$entityClass] = [
                    "status" => $entityClassResponse->getStatus(),
                    "content" => $entityClassResponse->getContent(),
                ];
            } else {
                $content[$entityClass] = $entityClassResponse->getContent();
            }
        }
        return $content;
    }
}

class HttpResponse2 extends Response
{
    /** @var array <string> */
    protected $headers;

    /** @var string */
    protected $content;

    public function __construct(int $status, string &$content, array &$headers = [])
    {
        if(array_get($headers, 'Content-Encoding') === 'gzip'){
          $this->content = gzencode($content,2);
        }else $this->content =& $content;

        $this->status = $status;
        $headers['Content-Length'] = strlen($this->content);
        $this->headers =& $headers;
    }

    public function getHeaders(): array
    {
      return  $this->headers;
    }

    private function echoHeaders()//TODO : void
    {
        foreach ($this->headers as $key => $value) {
            header($key . ': ' . $value);
        }
    }

    private function echoStatus()//TODO : void
    {
        http_response_code($this->status);
    }

    private function echoContent()//TODO : void
    {
        echo $this->content;
    }

    public function echo(bool $includeHeaders = true): int
    {
        $this->echoStatus();
        if($includeHeaders) $this->echoHeaders();
        $this->echoContent();
        return $this->status;
    }
}
