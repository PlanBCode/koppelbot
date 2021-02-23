<?php

class ConnectorRequest
{
    /** @var PropertyRequest[] */
    protected $propertyRequests = [];

    public function add(PropertyRequest &$propertyRequest)//TODO : void
    {
        $this->propertyRequests[] = $propertyRequest;
    }

    public function merge(ConnectorRequest &$connectorRequest)//TODO : void
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
            $entityIds = explode(',',$propertyRequest->getEntityIdList());
            if (($entityId === '' || $entityId === '*' || in_array($entityId,$entityIds)) && !$propertyRequest->isReadOnly()) return false;
        }
        return true;
    }

    public function isDeletion(string $entityId = ''): bool
    {
        foreach ($this->propertyRequests as $propertyRequest) {
            $entityIds = explode(',',$propertyRequest->getEntityIdList());
            if (($entityId === '' || $entityId === '*' || in_array($entityId,$entityIds)) && $propertyRequest->isDeletion()) return true;
        }
        return false;
    }

    public function getPostIdPropertyRequests(): array
    {
      $postIdPropertyRequests = [];
      foreach ($this->propertyRequests as $propertyRequest) {
          if ($propertyRequest->isPostId()) $postIdPropertyRequests[] =  $propertyRequest;
      }
      return $postIdPropertyRequests;
    }

    public function updateAutoIncrementedUris(array &$remappedAutoIncrementedUris)//TODO : void
    {
        foreach ($this->propertyRequests as $propertyRequest) {
          $propertyRequest->updateAutoIncrementedUri($remappedAutoIncrementedUris);
        }
    }
}
