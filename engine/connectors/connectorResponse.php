<?php


class StorageResponse extends Response
{
    /** @var RequestResponse[] */
    protected $requestResponses = [];

    public function __construct(int $status = 200)
    {
        $this->addStatus($status);
    }

    public function add(int $status, PropertyRequest $propertyRequest, string $entityId, $content): StorageResponse
    {
        $this->addStatus($status);
        $requestId = $propertyRequest->getRequestId();
        if (!array_key_exists($requestId, $this->requestResponses)) {
            $this->requestResponses[$requestId] = new RequestResponse($requestId);
        }
        $this->requestResponses[$requestId]->add($status, $propertyRequest->getEntityClass(), $entityId, $propertyRequest->getPropertyPath(), $content);
        return $this;
    }

    public function merge(StorageResponse $storageResponse): StorageResponse
    {
        $this->addStatus($storageResponse->getStatus());
        foreach ($storageResponse->requestResponses as $requestId => $requestResponse) {
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
