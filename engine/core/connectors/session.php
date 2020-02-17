<?php

function handleLogin(PropertyRequest &$propertyRequest, ConnectorResponse &$connectorResponse): ConnectorResponse
{
    $userName = $propertyRequest->getEntityId();
    $submittedPasswordArray = $propertyRequest->getContent();

    if (!is_array($submittedPasswordArray) || !array_key_exists('password', $submittedPasswordArray)) return $connectorResponse->add(403, $propertyRequest, $userName, 'Incorrect user-password combination.');

    $accountsMatchingUserName = request('/account/*/password?email==' . $userName)->getResultsById();
    if (count($accountsMatchingUserName) === 0) return $connectorResponse->add(403, $propertyRequest, $userName, 'Incorrect user-password combination.');

    /** @var InternalEntityResponse */
    $account = array_values($accountsMatchingUserName)[0];

    /** @var InternalPropertyResponse */
    $passwordResponse = $account->get('password');
    if ($passwordResponse->getStatus() !== 200) return $connectorResponse->add(403, $propertyRequest, $userName, 'Incorrect user-password combination.');

    $storedPasswordHash = $passwordResponse->getContent();
    $submittedPassword = $submittedPasswordArray['password'];

    if (!password_verify($submittedPassword, $storedPasswordHash)) {
        return $connectorResponse->add(403, $propertyRequest, $userName, 'Incorrect user-password combination.');
    }
    if (!array_key_exists('content', $_SESSION)) $_SESSION['content'] = [];
    $_SESSION['content'][$userName] = [];
    return $connectorResponse->add(200, $propertyRequest, $userName, 'Login successfull');

}

class Connector_session extends Connector
{
    static protected function getConnectorString(array $settings, string $method, string $entityClass, string $entityId, array $propertyPath, Query $query): string
    {
        return $method;
    }

    public function createResponse(connectorRequest $connectorRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        foreach ($connectorRequest->getPropertyRequests() as $propertyRequest) {
            $connectorResponse->merge($this->createPropertyResponse($propertyRequest));
        }
        return $connectorResponse;
    }

    protected function createPropertyResponse(PropertyRequest &$propertyRequest): connectorResponse
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
        $connectorResponse = new connectorResponse();
        $connectorResponse->add(400, $propertyRequest, '*', 'Illegal session method');
        return $connectorResponse;
    }

    protected function login(PropertyRequest &$propertyRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        $propertyName = $propertyRequest->getProperty()->getName();
        $userName = $propertyRequest->getEntityId();

        if ($userName === '*') {
            return $connectorResponse->add(400, $propertyRequest, $userName, 'Session not defined.');
        } elseif ($propertyName === 'login') { //TODO should not rely on name but should use type instead
            return handleLogin($propertyRequest, $connectorResponse);
        } else if (array_key_exists('content', $_SESSION) && array_key_exists($userName, $_SESSION['content'])) {
            $keyPath = array_merge(['content', $userName], $propertyRequest->getPropertyPath());
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
                return $connectorResponse->add(200, $propertyRequest, $userName, null);
            } else {
                return $connectorResponse->add(500, $propertyRequest, $userName, 'Data could not be stored.');
            }
        } else {
            return $connectorResponse->add(403, $propertyRequest, $userName, 'Forbidden.');
        }
    }

    protected function logout(PropertyRequest &$propertyRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        $userName = $propertyRequest->getEntityId();
        if ($userName === '*') {
            $_SESSION['content'] = [];
            session_destroy();
            return $connectorResponse->add(200, $propertyRequest, '*', 'Successfully logged out.');
        }
        if (!array_key_exists($userName, $_SESSION['content'])) {
            return $connectorResponse->add(404, $propertyRequest, $userName, 'Not found.');
        }
        unset($_SESSION['content'][$userName]);
        if (empty($_SESSION['content'])) {
            session_destroy();
        }
        return $connectorResponse->add(200, $propertyRequest, $userName, 'Successfully logged out.');
    }

    protected function getSession(PropertyRequest &$propertyRequest): connectorResponse
    {
        $connectorResponse = new connectorResponse();
        $propertyName = $propertyRequest->getProperty()->getName();
        $userNameList = $propertyRequest->getEntityId();
        if (!array_key_exists('content', $_SESSION)) {
            if ($userNameList !== '*') {
                $connectorResponse->add(404, $propertyRequest, $userNameList, 'Not found');
            }
            return $connectorResponse;
        }

        $userNames = $userNameList === '*'
            ? array_keys($_SESSION['content'])
            : explode(',', $userNameList);
        foreach ($userNames as $userName) {
            if (!array_key_exists($userName, $_SESSION['content'])) {
                $connectorResponse->add(404, $propertyRequest, $userName, 'Not found');
                continue;
            }

            if ($propertyName === 'login') { // TODO should not rely on name but use type instead
                $connectorResponse->add(200, $propertyRequest, $userName, ['username' => $userName, 'password' => '***']);
                continue;
            }
            $keyPath = array_merge([$userName], $propertyRequest->getPropertyPath());
            $jsonActionResponse = json_get($_SESSION['content'], $keyPath);
            if ($jsonActionResponse->succeeded()) {
                $connectorResponse->add(200, $propertyRequest, $userName, $jsonActionResponse->content);
            } else {
                //TODO use $jsonActionResponse errors
                $connectorResponse->add(500, $propertyRequest, $userName, 'Data could not be retrieved.');
            }
        }
        return $connectorResponse;
    }
}
