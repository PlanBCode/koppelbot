<?php

class Type_reference
{
    public function validate($content, array $settings): bool
    {
        $entityClassName = array_get($settings, 'class');
        if (!is_string($entityClassName)) {
            return false;
        }
        $entityClass = EntityClass::get($entityClassName);
        if(is_null($entityClass)){
            return false;
        }
        // TODO check if $content is an existing id for this entity class
        return is_string($entityClassName);
    }
}