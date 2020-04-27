<?php

class AccessControl
{
    public const permissionVerbsToMethods = [
        'head' => ['HEAD'],
        'get' => ['GET'],
        'patch' => ['PATCH'],
        'put' => ['PUT'],
        'post' => ['POST'],
        'delete' => ['DELETE'],

        'read' => ['HEAD', 'GET'],
        'write' => ['HEAD', 'GET', 'PATCH', 'PUT', 'POST'],
        'create' => ['HEAD', 'GET', 'PUT', 'POST'],
    ];

    public const defaultGroups = ['guest'];
    static private function subCheck(string $method, array $userGroups, array &$accessSettings): bool
    {
        foreach ($accessSettings as $verb => $accessGroups) {
            if (array_key_exists($verb, self::permissionVerbsToMethods)) {
                if (in_array($method, self::permissionVerbsToMethods[$verb])) {
                    if (count(array_intersect($userGroups, $accessGroups)) > 0) return true;
                }
            }
        }
        return false;
    }

    static public function check(string $method, array &$accessSettings): bool
    {
        if (!array_key_exists('content', $_SESSION)) {
            return self::subcheck($method, self::defaultGroups, $accessSettings);
        } else {
            foreach ($_SESSION['content'] as $userName => $session) {
                if (self::subcheck($method, $session['groups'], $accessSettings)) return true;
            }
        }
        return false;
    }
}
