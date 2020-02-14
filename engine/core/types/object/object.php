<?php
require_once 'array.php';

class Type_object extends Type_array
{
    static function validateSubPropertyPath(array $subPropertyPath, array $settings): bool
    {
        $subSettings = array_get($settings, 'subType', []);
        $subTypeName = array_get($subSettings, 'type', self::$DEFAULT_TYPE);
        $subTypeClass = Type::get($subTypeName);
        return count($subPropertyPath) <= 1 || $subTypeClass::validateSubPropertyPath(array_slice($subPropertyPath, 1), $subSettings);
    }
}
