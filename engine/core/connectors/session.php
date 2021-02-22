<?php

function handleLogin(PropertyRequest &$propertyRequest, ConnectorResponse &$connectorResponse): ConnectorResponse
{
    $userName = $propertyRequest->getEntityIdList(); // TODO explode
    $submittedPasswordArray = $propertyRequest->getContent();
    if (!is_array($submittedPasswordArray) || !array_key_exists('password', $submittedPasswordArray)) {
      $error = 'Incorrect user-password combination.';
      return $connectorResponse->add(403, $propertyRequest, $userName, $error);
    }

    $accessGroups = ['system'];
    $headers = [];
    $accountsMatchingUserName = request('/account/*/password,groups?username==' . $userName, 'GET', '', $headers, $accessGroups)->getResultsById();
    if (count($accountsMatchingUserName) === 0) {
      $content = 'Incorrect user-password combination.';
      return $connectorResponse->add(403, $propertyRequest, $userName, $content);
    }

    /** @var InternalEntityResponse */
    $account = array_values($accountsMatchingUserName)[0];
    /** @var InternalPropertyResponse */
    $passwordResponse = $account->get('password');
    if ($passwordResponse->getStatus() !== 200) {
      $content = 'Incorrect user-password combination.'.$passwordResponse->getStatus().' '.$userName;
      return $connectorResponse->add(403, $propertyRequest, $userName, $content);
    }

    $submittedPassword = $submittedPasswordArray['password'];
    $storedPasswordHash = $passwordResponse->getContent();

    if (!password_verify($submittedPassword, $storedPasswordHash)) {
        $content = 'Incorrect user-password combination.';
        return $connectorResponse->add(403, $propertyRequest, $userName, $content);
    }
    if (!array_key_exists('content', $_SESSION)) $_SESSION['content'] = [];
    $groupsResponse = $account->get('groups');
    $groups = $groupsResponse->getStatus() !== 200 ? [] : $groupsResponse->getContent();
    $groups[] = 'user:' . $userName;
    $_SESSION['content'][$userName] = ['groups' => $groups];
    $content = null;
    return $connectorResponse->add(200, $propertyRequest, $userName, $content); //TODO 'login successful;'
}

class Connector_session extends Connector
{
    static protected function getConnectorString(array &$settings, string $method, string $entityClass, string $entityId, array &$propertyPath, Query &$query): string
    {
        return $method;
    }

    public function createResponse(connectorRequest &$connectorRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $connectorResponse->merge($this->createPropertyResponse($propertyRequest));
        }
        return $connectorResponse;
    }

    protected function createPropertyResponse(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        switch ($propertyRequest->getMethod()) {
            case 'PUT':
                return $this->login($propertyRequest);
            case 'DELETE':
                return $this->logout($propertyRequest);
            case 'GET':
            case 'HEAD':
                return $this->getSession($propertyRequest);
            default:
        }
        $connectorResponse = new ConnectorResponse();
        $content = 'Illegal session method';
        $connectorResponse->add(400, $propertyRequest, '*', $content);
        return $connectorResponse;
    }

    protected function login(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        $propertyName = $propertyRequest->getProperty()->getName();
        $userName = $propertyRequest->getEntityIdList();//TODO explode

        if ($userName === '*') {
            $content = 'Session not defined.';
            return $connectorResponse->add(400, $propertyRequest, $userName, $content);
        } elseif ($propertyName === 'login') { //TODO should not rely on name but should use type instead
            return handleLogin($propertyRequest, $connectorResponse);
        } else if (array_key_exists('content', $_SESSION) && array_key_exists($userName, $_SESSION['content'])) {
            $propertyPath = $propertyRequest->getPropertyPath();

            // groups are handled automatically
            if (count($propertyPath) === 1 && $propertyPath[0] === 'groups') return $connectorResponse;

            $keyPath = array_merge(['content', $userName], $propertyPath);
            $newContent = $propertyRequest->getContent();

            $jsonActionResponseGet = json_get($_SESSION, $keyPath);
            $currentContent = $jsonActionResponseGet->succeeded() ? $jsonActionResponseGet->content : null;

            $processResponse = $propertyRequest->processBeforeConnector($newContent, $currentContent);
            if (!$processResponse->succeeded()) {
                return $connectorResponse->add($processResponse->getStatus(), $propertyRequest, $userName, $processResponse->getError());
            }

            $newContent = $processResponse->getContent();
            $jsonActionResponseSet = json_set($_SESSION, $keyPath, $newContent);
            if ($jsonActionResponseSet->succeeded()) {
                $content = null;
                return $connectorResponse->add(200, $propertyRequest, $userName, $content);
            } else {
                $error = 'Data could not be stored.';
                return $connectorResponse->add(500, $propertyRequest, $userName, $error);
            }
        } else {
            $error = 'Forbidden.';
            return $connectorResponse->add(403, $propertyRequest, $userName, $error);
        }
    }

    protected function logout(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        $userName = $propertyRequest->getEntityIdList(); //TODO explode
        if ($userName === '*') {
            $_SESSION['content'] = [];
            if (!session_id()) session_destroy();
            $content = null;
            return $connectorResponse->add(200, $propertyRequest, '*', $content);//TODO 'Successfully logged out.'
        }
        if (!array_key_exists($userName, $_SESSION['content'])) {
            $content = 'Not found.';
            return $connectorResponse->add(404, $propertyRequest, $userName, $content);
        }
        unset($_SESSION['content'][$userName]);
        if (empty($_SESSION['content']) && !session_id()) session_destroy();
        $content = null;
        return $connectorResponse->add(200, $propertyRequest, $userName, $content); //TODO 'Successfully logged out.'
    }

    protected function getSession(PropertyRequest &$propertyRequest): ConnectorResponse
    {
        $connectorResponse = new ConnectorResponse();
        $propertyName = $propertyRequest->getProperty()->getName();
        $userNameList = $propertyRequest->getEntityIdList();
        if (!array_key_exists('content', $_SESSION)) {
            if ($userNameList !== '*') {
                $content = 'Not found.';
                $connectorResponse->add(404, $propertyRequest, $userNameList, $content);
            }
            return $connectorResponse;
        }

        $userNames = $userNameList === '*'
            ? array_keys($_SESSION['content'])
            : explode(',', $userNameList);
        foreach ($userNames as $userName) {
            if (!array_key_exists($userName, $_SESSION['content'])) {
                $content = 'Not found.';
                $connectorResponse->add(404, $propertyRequest, $userName, $content);
                continue;
            }

            if ($propertyName === 'login') { // TODO should not rely on name but use type instead
                $contnet = ['username' => $userName, 'password' => '***'];
                $connectorResponse->add(200, $propertyRequest, $userName,  $content);
                continue;
            }
            $keyPath = array_merge([$userName], $propertyRequest->getPropertyPath());
            $jsonActionResponse = json_get($_SESSION['content'], $keyPath);
            if ($jsonActionResponse->succeeded()) {
                $connectorResponse->add(200, $propertyRequest, $userName, $jsonActionResponse->content);
            } else {
                //TODO use $jsonActionResponse errors
                $content = 'Data could not be retrieved.';
                $connectorResponse->add(500, $propertyRequest, $userName, $content);
            }
        }
        return $connectorResponse;
    }

    protected function getAutoIncrementedId(string $entityId, PropertyRequest& $propertyRequest): ?string
    {
      return null;
    }
}
