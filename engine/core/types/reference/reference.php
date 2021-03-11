<?php

class Type_reference extends Type
{
    public static function validateContent(&$content, array &$settings): bool
    {
        if (!is_string($content)) return false;
        return strpos($content,'/') === false; //TODO maybe more requirements?
   }

   static function validateSubPropertyPath(array &$subPropertyPath, array &$settings): bool
   {
       return true; // TODO validate based on reference entityClass?
   }
}
