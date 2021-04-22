<?php

class Type_enum extends Type
{
    public static function validateContent(&$content, array &$settings): bool
    {
      $choices = array_get($settings, 'choices');
      if (!is_array($choices)) return false;
      if(is_int(array_keys($choices)[0]))  return in_array($content, $choices);
      else return array_key_exists($content,$choices);
    }
}
