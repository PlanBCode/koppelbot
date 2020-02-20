<?php

class Type_number extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        return is_numeric($content); //TODO min, max, int, step, nr of decimals
    }

    //TODO handle leadingZeroes
    /*static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        if (($method === 'PUT' || $method === 'PATCH' || $method === 'POST')) {
            return new ProcessResponse(200, $newContent);
        } else {
            return new ProcessResponse(200, $newContent);
        }

    }*/
}
