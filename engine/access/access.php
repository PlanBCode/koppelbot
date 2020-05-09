<?php

class AccessControl
{
    static private function subCheck(string $method, array $userGroups, array &$accessSettings): bool
    {
        foreach ($accessSettings as $verb => $accessGroups) {
            if (array_key_exists($verb, $GLOBALS['constants']['accessVerbsToMethods'])) {
                if (in_array($method, $GLOBALS['constants']['accessVerbsToMethods'][$verb])) {
                    if (count(array_intersect($userGroups, $accessGroups)) > 0) return true;
                }
            }
        }
        return false;
    }

    static public function check(string $method, array &$accessSettings): bool
    {
        if (array_key_exists('content', $_SESSION)) {
            foreach ($_SESSION['content'] as $userName => $session) {
                if (is_array($session['groups']) && self::subcheck($method, $session['groups'], $accessSettings)) return true;
            }
        }
        return self::subcheck($method, $GLOBALS['constants']['defaultGroups'], $accessSettings);
    }
}

