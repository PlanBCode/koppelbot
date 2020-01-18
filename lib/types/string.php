<?php

class Type_string extends Type
{
    public static function validate($content, array $settings): bool
    {
        return is_string($content); //TODO  min, max length, regex
    }
}
