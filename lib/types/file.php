<?php

class Type_file extends Type
{
    public function validate($value, array $settings): bool
    {
        //todo mime/accept
        //todo max size
        return true;
    }
}
