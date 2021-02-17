<?php

class Type_json extends Type
{
    public static function validateContent(&$content, array &$settings): bool
    {
        return true;
    }

    static function validateSubPropertyPath(array &$subPropertyPath, array &$settings): bool
    {
        return true;
    }

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        $stringify = array_get($settings, 'stringify', false);

        return $stringify
          ? new ProcessResponse(200, json_encode($newContent)) // TODO catch error?
          : new ProcessResponse(200, $newContent);
    }

    static function processAfterConnector(string $method, &$content, array &$settings): ProcessResponse
    {
      $stringify = array_get($settings, 'stringify', false);
      if($stringify){
        $parsedContent =& json_decode($content);
        return  is_null($parsedContent)
         ? new ProcessResponse(500, 'Failed to parse JSON.') // TODO add json error?
         : new ProcessResponse(200, $parsedContent);
      } else return new ProcessResponse(200, $content);
    }
}
