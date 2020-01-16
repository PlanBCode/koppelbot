<?php

class Type_bool extends Type
{
    public static function validate($content, array $settings): bool
    {
        return is_bool(content);
    }
}
