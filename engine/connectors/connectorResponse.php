<?php

class ConnectorResponse extends Response
{
    /** @var RequestResponse[] */
    protected $requestResponses = [];
    /** @var string[] */
    protected $remappedAutoIncrementedUris = [];

    public function __construct(int $status = null)
    {
        if (!is_null($status)) $this->addStatus($status);
    }

    public function remapAutoIncrementedUris(array &$remappedAutoIncrementedUris): void
    {
      $this->remappedAutoIncrementedUris += $remappedAutoIncrementedUris;
      foreach($this->requestResponses as $requestResponse){
        $requestResponse->addRemappedAutoIncrementedUris($remappedAutoIncrementedUris);
      }
    }

    public function add(int $status, PropertyRequest &$propertyRequest, string $entityId, &$content): ConnectorResponse
    {
        $method = $propertyRequest->getMethod();
        if ($method === 'POST' && $status === 404) return $this; // POST request are made with dummy entityId's if hey can't be found. Ignore it.

        $this->addStatus($status);
        $requestId = $propertyRequest->getRequestId();
        if (!array_key_exists($requestId, $this->requestResponses)) {
            $requestObject = $propertyRequest->getRequestObject();
            $this->requestResponses[$requestId] = new RequestResponse($requestObject, $this->remappedAutoIncrementedUris);
        }
        $this->requestResponses[$requestId]->add($status, $propertyRequest->getEntityClass(), $entityId, $propertyRequest->getPropertyPath(), $content, $this->remappedAutoIncrementedUris);
        return $this;
    }

    public function merge(ConnectorResponse &$connectorResponse): ConnectorResponse
    {
        $this->addStatus($connectorResponse->getStatus());
        foreach ($connectorResponse->requestResponses as $requestId => $requestResponse) {
            if (!array_key_exists($requestId, $this->requestResponses)) {
                $this->requestResponses[$requestId] = $requestResponse;
            } else {
                $this->requestResponses[$requestId]->merge($requestResponse);
            }
        }
        return $this;
    }

    public function getRequestResponses(): array
    {
        return $this->requestResponses;
    }
}
