<?php

abstract class Type
{
    abstract public function validate($value, array $settings): bool;

    static function signature()
    {
        $className = get_called_class();
        if (substr($className, 0, 5) === 'Type_') {
            return substr($className, 5);
        } else {
            //TODO
            return 'SIGNATURE ERROR';
        }
    }
}