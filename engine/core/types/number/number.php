<?php

class Type_number extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        return is_numeric($content); //TODO min, max, int, step, nr of decimals
    }
}