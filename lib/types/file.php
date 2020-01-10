<?php

class Type_file extends Type
{
    static function signature()
    {
        return ['id' => 'string', 'content' => 'string'];
    }

    public function validate($value, array $settings): bool
    {
        //todo mime/accept
        //todo max size
        return true;
    }
}
