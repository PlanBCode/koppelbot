<?php

class Type_array extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        if (!is_array($content)) {
            return false;
        }
        $subSettings = array_get($settings, 'subSettings', []);
        $subTypeName = array_get($subSettings, 'type', 'string');
        $subType = Type::get($subTypeName);
        foreach ($content as $subContent) {
            if (!$subType::validateContent($subContent, $subSettings)) {
                return false;
            }
        }
        return true;
    }

    static function validateSubPropertyPath(array $subPropertyPath, array $settings): bool
    {
        return count($subPropertyPath) === 1 && ctype_digit($subPropertyPath[0]);
    }

}
