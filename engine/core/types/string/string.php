<?php

class Type_string extends Type
{
    static protected $encodings = ['utf8', 'base64']; //TODO single source of truth (php+js)

    public static function validateContent($content, array &$settings): bool
    {
        if (is_string($content)) {
            if (strlen($content) < array_get($settings, 'minLength', 0)) return false;
            if (array_key_exists('maxLength',$settings) && strlen($content) > array_get($settings, 'minLength', 0)) return false;
            return true;//TODO  min, max length, regex
        } elseif (is_array($content) && array_get($settings, 'binary', false)) {
            if (!array_key_exists('encoding', $content)) return false;
            if (!array_key_exists('content', $content)) return false;
            if (!is_string(array_get($content, 'content'))) return false;
            if (!in_array(array_get($content, 'encoding'), self::$encodings)) return false;
            //TODO check base64
            return true;
        }
        return false;
    }

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        $isModifyMethod = $method === 'PUT' || $method === 'PATCH' || $method === 'POST';
        $isBinary = array_get($settings, 'binary', false);
        $isArray = is_array($newContent);

        if ($isModifyMethod && $isBinary && $isArray) {
            $encoding = array_get($newContent, 'encoding', 'utf8');
            if ($encoding === 'base64') {
                return new ProcessResponse(200, base64_decode($newContent['content']));
            } else if ($encoding === 'utf8') {
                return new ProcessResponse(200, $newContent['content']);
            } else {
                $message = 'Invalid encoding';
                return new ProcessResponse(400, $message);
            }
        } else {
            return new ProcessResponse(200, $newContent);
        }
    }

    static function processAfterConnector(string $method, $content, array &$settings): ProcessResponse
    {
        $isGetMethod = $method === 'GET';
        $isBinary = array_get($settings, 'binary', false);
        $isString = is_string($content);
        if ($isGetMethod && $isBinary && $isString) {
            $newContent = [
                'content' => base64_encode($content),
                'encoding' => 'base64'
            ];
            return new ProcessResponse(200, $newContent);
        } else {
            return new ProcessResponse(200, $content);
        }
    }
}
