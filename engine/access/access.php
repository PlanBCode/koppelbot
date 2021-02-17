<?php

class AccessControl
{
    static public function check(string $method, array &$accessSettings, array &$accessGroups): bool
    {
        foreach ($accessSettings as $verb => &$verbAccessGroups) {
            if (array_key_exists($verb, $GLOBALS['constants']['accessVerbsToMethods'])) {
                if (in_array($method, $GLOBALS['constants']['accessVerbsToMethods'][$verb])) {
                    if (count(array_intersect($accessGroups, $verbAccessGroups)) > 0) return true;
                }
            }
        }
        return false;
    }
}
