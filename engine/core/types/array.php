<?php

class Type_array extends Type
{
    static protected $DEFAULT_TYPE = 'string';

    public static function validateContent($content, array $settings): bool
    {
        if (!is_array($content)) {
            return false;
        }
        $subSettings = array_get($settings, 'subSettings', []);
        $subTypeName = array_get($subSettings, 'type', 'string');
        $subTypeClass = Type::get($subTypeName);
        foreach ($content as $subContent) {
            if (!$subTypeClass::validateContent($subContent, $subSettings)) {
                return false;
            }
        }
        return true;
    }

    static function validateSubPropertyPath(array $subPropertyPath, array $settings): bool
    {
        $subSettings = array_get($settings, 'subType', []);
        $subTypeName = array_get($subSettings, 'type', self::$DEFAULT_TYPE);
        $subTypeClass = Type::get($subTypeName);
        return ctype_digit($subPropertyPath[0]) && (
            count($subPropertyPath) <= 1  ||
            $subTypeClass->validateSubPropertyPath(array_slice($subPropertyPath, 1), $subSettings)
            );
    }

}
