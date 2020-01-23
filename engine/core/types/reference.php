<?php

class Type_reference extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        /*
        TODO check if $content is an existing id for this entity class

        $entityClassName = array_get($settings, 'uri');
         if (!is_string($entityClassName)) {
             return false;
         }
        $entityClass = EntityClass::get($entityClassName);
         if(is_null($entityClass)){
             return false;
         }*/
        return is_string($content);
    }
}