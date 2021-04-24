<?php

class Type_object extends Type
{
    static protected $DEFAULT_TYPE = 'string';

    public static function validateContent(&$content, array &$settings): bool
    {
        if (!is_array($content)) return false;
        $subSettings = array_get($settings, 'subSettings', []);
        $subTypeName = array_get($subSettings, 'type', 'string');
        $subTypeClass = Type::get($subTypeName);
        foreach ($content as $subContent) {
            if (!$subTypeClass::validateContent($subContent, $subSettings)) {
                return false;
            }
        }
        return true;
    }

    static function validateSubPropertyPath(array &$subPropertyPath, array &$settings): bool
    {
        $subSettings = array_get($settings, 'subType', []);
        $subTypeName = array_get($subSettings, 'type', self::$DEFAULT_TYPE);
        $subTypeClass = Type::get($subTypeName);
        return count($subPropertyPath) <= 1 || $subTypeClass::validateSubPropertyPath(array_slice($subPropertyPath, 1), $subSettings);
    }

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        if(array_get($settings, 'stringify', false)){
          $stringifiedContent = json_encode($newContent);
          return ProcessResponse(200, $stringifiedContent); // TODO catch error?
        } else return new ProcessResponse(200, $newContent);
    }

    static function processAfterConnector(string $method, &$content, array &$settings): ProcessResponse
    {
      $stringify = array_get($settings, 'stringify', false);
      if($stringify){
        $parsedContent = json_decode($content);
        if(is_null($parsedContent)){
          if(is_null($content) || $content === 'null' || $content === ""){ // parsing didn't fail, it just return null
              return  new ProcessResponse(200, $parsedContent);
           } else {
             $error = 'Failed to parse JSON.';
             return new ProcessResponse(500, $error); // TODO add json error?
          }
        } else return new ProcessResponse(200, $parsedContent);
      } else return new ProcessResponse(200, $content);
    }
}
