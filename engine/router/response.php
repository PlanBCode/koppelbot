<?php

class Response
{
    /** @var int */
    protected $status;

    protected function addStatus(int $status): void
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
        return $this->status;
    }
}

class RequestResponse extends Response
{
    protected $requestId;

    /** @var EntityClassResponse[] */
    protected $entityClassResponses = [];

    public function __construct($requestId)
    {
        $this->requestId = $requestId;
    }

    public function add(int $status, string $entityClass, string $entityId, array $propertyPath, $content): void
    {
        $this->addStatus($status);
        if (!array_key_exists($entityClass, $this->entityClassResponses)) {
            $this->entityClassResponses[$entityClass] = new EntityClassResponse($entityClass);
        }
        $this->entityClassResponses[$entityClass]->add($status, $entityId, $propertyPath, $content);
    }

    public function merge(RequestResponse $requestResponse): void
    {
        $this->addStatus($requestResponse->getStatus());
        foreach ($requestResponse->entityClassResponses as $entityClass => $entityClassResponse) {
            if (!array_key_exists($entityClass, $this->entityClassResponses)) {
                $this->entityClassResponses[$entityClass] = $entityClassResponse;
            } else {
                $this->entityClassResponses[$entityClass]->merge($entityClassResponse);
            }
        }
    }

    public function getEntityClassResponses(): array
    {
        return $this->entityClassResponses;
    }

    public function getContent()
    {
        $content = [];
        foreach ($this->entityClassResponses as $entityClass => $entityClassResponse) {
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

    public function __construct(int $status, string $content, array $headers = [])
    {
        $this->status = $status;
        $this->content = $content;
        $this->headers = $headers;
    }

    private function echoHeaders(): void
    {
        foreach ($this->headers as $key => $value) {
            header($key . ': ' . $value);
        }
    }

    private function echoStatus(): void
    {
        http_response_code($this->status);
    }

    private function echoContent(): void
    {
        echo $this->content;
    }

    public function echo(): int
    {
        $this->echoStatus();
        $this->echoContent();
        $this->echoHeaders();
        return $this->status;
    }
}