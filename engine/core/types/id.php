<?php

class Type_id extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        //todo always false, should not be used as it is auto incremented
        return true;
    }
}
