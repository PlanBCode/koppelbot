<?php

class connectorRequest
{
    /** @var PropertyRequest[] */
    protected $propertyRequests = [];

    public function add($propertyRequest): void
    {
        $this->propertyRequests[] = $propertyRequest;
    }

    public function merge($connectorRequest): void
    {
        array_push($this->propertyRequests, ...$connectorRequest->propertyRequests);
    }

    public function getPropertyRequests(): array
    {
        return $this->propertyRequests;
    }

    public function getFirstPropertyRequest(): PropertyRequest
    {
        return reset($this->propertyRequests);
    }

    public function isReadOnly(string $entityId = ''): bool
    {
        foreach ($this->propertyRequests as $propertyRequest) {
            if (($entityId === '' || $entityId === $propertyRequest->getEntityId()) && !$propertyRequest->isReadOnly()) {
                return false;
            }
        }
        return true;
    }

    public function isDeletion(string $entityId = ''): bool
    {
        foreach ($this->propertyRequests as $propertyRequest) {
            if (($entityId === '' || $entityId === $propertyRequest->getEntityId()) && $propertyRequest->isDeletion()) {
                return true;
            }
        }
        return false;
    }
}