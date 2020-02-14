<?php

class Type_enum extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        $choices = array_get($settings, 'choices');
        if (!is_array($choices)) {
            return false;
        }
        return in_array($content, $choices);
    }
}
