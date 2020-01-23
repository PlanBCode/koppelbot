<?php

class Type_password extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        return is_string($content); //TODO  min, max length, allowedChars
    }
}
