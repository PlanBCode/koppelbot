<?php

class Type_reference extends Type
{
    public static function validateContent(&$content, array &$settings): bool
    {
        if (!is_string($content)) return false;
        return strpos($content,'/') === false; //TODO maybe more requirements?
   }
}
