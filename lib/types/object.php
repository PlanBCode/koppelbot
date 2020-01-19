<?php

class Type_object extends Type_array
{
    static function validateSubPropertyPath(array $subPropertyPath, array $settings): bool
    {
        return count($subPropertyPath) === 1;
    }
}
