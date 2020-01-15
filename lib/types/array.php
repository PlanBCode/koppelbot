<?php

class Type_array extends Type
{
    public static function validate($content, array $settings): bool
    {
        if (!is_array($content)) {
            return false;
        }
        $subSettings = array_get($settings, 'subSettings', []);
        $subTypeName = array_get($subSettings, 'type', 'string');
        $subType = Type::get($subTypeName);
        foreach ($content as $subContent) {
            if (!$subType::validate($subContent, $subSettings)) {
                return false;
            }
        }
        return true;
    }
}
