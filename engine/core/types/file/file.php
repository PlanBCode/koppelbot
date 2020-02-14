<?php

class Type_file extends Type
{
    public static function signature(array &$settings)
    {
        return ['id' => 'string', 'content' => 'string', 'extension' => 'string'];
    }

    public static function validateContent($value, array $settings): bool
    {
        //todo mime/accept
        //todo max size
        return true;
    }
}
