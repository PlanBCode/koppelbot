<?php

class Type_file extends Type
{
    public static function signature()
    {
        return ['id' => 'string', 'content' => 'string'];
    }

    public static function validateContent($value, array $settings): bool
    {
        //todo mime/accept
        //todo max size
        return true;
    }
}
