<?php

class ConnectorResponse extends Response
{
    /** @var RequestResponse[] */
    protected $requestResponses = [];

    public function __construct(int $status = null)
    {
        if(!is_null($status)) $this->addStatus($status);
    }

    public function add(int $status, PropertyRequest $propertyRequest, string $entityId, $content): ConnectorResponse
    {
        $this->addStatus($status);
        $requestId = $propertyRequest->getRequestId();
        if (!array_key_exists($requestId, $this->requestResponses)) {
            $this->requestResponses[$requestId] = new RequestResponse($propertyRequest->getRequestObject());
        }
        $method = $propertyRequest->getMethod();
        $this->requestResponses[$requestId]->add($method, $status, $propertyRequest->getEntityClass(), $entityId, $propertyRequest->getPropertyPath(), $content);
        return $this;
    }

    public function merge(ConnectorResponse $connectorResponse): ConnectorResponse
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
