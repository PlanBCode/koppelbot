<?php

class Type_bool extends Type
{
    public static function validateContent(&$content, array &$settings): bool
    {
        return is_bool($content);
    }
}
