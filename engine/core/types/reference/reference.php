<?php

class Type_reference extends Type
{
    public static function validateContent($content, array &$settings): bool
    {
        // content should be "/$entityClassName/$entityId"
        if (!is_string($content)) return false;
        $uri = array_get($settings, 'uri');
        if ($uri === null) return false;
        $entityClassName = explode('/', substr($uri, 1))[0];
        $referencePath = explode('/', substr($content, 1));
        return array_get($referencePath, 0) === $entityClassName && count($referencePath) === 2;
   }
}