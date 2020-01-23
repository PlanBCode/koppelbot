<?php

class Storage_session extends Storage
{
    static protected function getStorageString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        return $method;
    }

    public function createResponse(StorageRequest $storageRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        foreach ($storageRequest->getPropertyRequests() as $propertyRequest) {
            $storageResponse->merge($this->createPropertyResponse($propertyRequest));
        }
        return $storageResponse;
    }

    protected function createPropertyResponse(PropertyRequest &$propertyRequest): StorageResponse
    {
        switch ($propertyRequest->getMethod()) {
            case 'PUT':
                return $this->login($propertyRequest);
            case 'DELETE':
                return $this->logout($propertyRequest);
            case 'GET':
                return $this->getSession($propertyRequest);
            default:
        }
        $storageResponse = new StorageResponse();
        $storageResponse->add(400, $propertyRequest, '*', 'Illegal session method');
        return $storageResponse;
    }

    protected function login(PropertyRequest &$propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $propertyName = $propertyRequest->getProperty()->getName();
        $userName = $propertyRequest->getEntityId();
        if ($userName === '*') {
            return $storageResponse->add(400, $propertyRequest, $userName, 'Session not defined.');
        } elseif ($propertyName === 'username') {
            return $storageResponse->add(200, $propertyRequest, $userName, $userName);
        } elseif ($propertyName === 'password') {
            //TODO verify password with /account/username/password
            if (!array_key_exists('content', $_SESSION)) $_SESSION['content'] = [];
            $_SESSION['content'][$userName] = [];
            return $storageResponse->add(200, $propertyRequest, $userName, 'Login successfull');
        } else if (array_key_exists('content', $_SESSION) && array_key_exists($userName, $_SESSION['content'])) {
            $keyPath = array_merge(['content', $userName], $propertyRequest->getPropertyPath());
            $content = $propertyRequest->getContent();
            $jsonActionResponse = json_set($_SESSION, $keyPath, $content);
            if ($jsonActionResponse->succeeded()) {
                return $storageResponse->add(200, $propertyRequest, $userName, null);
            } else {
                return $storageResponse->add(500, $propertyRequest, $userName, 'Data could not be stored.');
            }
        } else {
            return $storageResponse->add(403, $propertyRequest, $userName, 'Forbidden.');
        }
    }

    protected function logout(PropertyRequest &$propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $userName = $propertyRequest->getEntityId();
        if ($userName === '*') {
            $_SESSION['content'] = [];
            session_destroy();
            return $storageResponse->add(200, $propertyRequest, '*', 'Successfully logged out.');
        }
        if (!array_key_exists($userName, $_SESSION['content'])) {
            return $storageResponse->add(404, $propertyRequest, $userName, 'Not found.');
        }
        unset($_SESSION['content'][$userName]);
        if (empty($_SESSION['content'])) {
            session_destroy();
        }
        return $storageResponse->add(200, $propertyRequest, $userName, 'Successfully logged out.');
        return $storageResponse;
    }

    protected function getSession(PropertyRequest &$propertyRequest): StorageResponse
    {
        $storageResponse = new StorageResponse();
        $propertyName = $propertyRequest->getProperty()->getName();
        $userNameList = $propertyRequest->getEntityId();
        if (!array_key_exists('content', $_SESSION)) {
            if ($userNameList !== '*') {
                $storageResponse->add(404, $propertyRequest, $userNameList, 'Not found');
            }
            return $storageResponse;
        }

        $userNames = $userNameList === '*'
            ? array_keys($_SESSION['content'])
            : explode(',', $userNameList);
        foreach ($userNames as $userName) {
            if (!array_key_exists($userName, $_SESSION['content'])) {
                $storageResponse->add(404, $propertyRequest, $userName, 'Not found');
                continue;
            }
            if ($propertyName === 'username') {
                $storageResponse->add(200, $propertyRequest, $userName, $userName);
                continue;
            }
            if ($propertyName === 'password') {
                $storageResponse->add(403, $propertyRequest, $userName, '***');
                continue;
            }
            $keyPath = array_merge([$userName], $propertyRequest->getPropertyPath());
            $jsonActionResponse = json_get($_SESSION['content'], $keyPath);
            if ($jsonActionResponse->succeeded()) {
                $storageResponse->add(200, $propertyRequest, $userName, $jsonActionResponse->content);
            } else {
                //TODO use $jsonActionResponse errors
                $storageResponse->add(500, $propertyRequest, $userName, 'Data could not be retrieved.');
            }
        }
        return $storageResponse;
    }
}
