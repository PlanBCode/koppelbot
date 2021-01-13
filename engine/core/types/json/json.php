<?php

class Type_json extends Type
{
    public static function validateContent($content, array &$settings): bool
    {
        return json_decode($content) !== null;
    }

    static function validateSubPropertyPath(array $subPropertyPath, array $settings): bool
    {
        return true;
    }

}
