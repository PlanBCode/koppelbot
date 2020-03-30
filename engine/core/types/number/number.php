<?php

class Type_number extends Type
{
    public static function toNumber(&$content, array &$settings): bool
    {
        return $content + 0;
    }

    public static function validateContent($content, array &$settings): bool
    {
        if (!is_numeric($content)) return false; //TODO nr of decimals
        if (array_key_exists('max', $settings) && $content > array_get($settings, 'max')) return false;
        if (array_key_exists('min', $settings) && $content < array_get($settings, 'min')) return false;
        if (array_key_exists('step', $settings) && $content / array_get($settings, 'step') !== floor($content / array_get($settings, 'step'))) return false;
        return true;
    }

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        //TODO fix nr of decimals
        if (($method === 'PUT' || $method === 'PATCH' || $method === 'POST')) {
            if (array_get($settings, 'leadingZeroes', false) && array_key_exists('max', $settings)) {
                $max = array_get($settings, 'max');
                $fixedLength = ceil(log10($max));
                if (!is_string($newContent)) $newContent = strval($newContent);
                $length = strlen($newContent);
                if ($length <= $fixedLength) {
                    $content = str_pad($newContent, $fixedLength, '0', STR_PAD_LEFT);
                    return new ProcessResponse(200, $content);
                } else {
                    return new ProcessResponse(500, $newContent);//TODO
                }
            } else {
                return new ProcessResponse(200, $newContent);
            }
        } else {
            return new ProcessResponse(200, $newContent);
        }
    }
}
