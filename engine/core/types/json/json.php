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
        if(array_get($settings, 'stringify', false)){
          $stringifiedContent = json_encode($newContent);
          return ProcessResponse(200, $stringifiedContent); // TODO catch error?
        } else return new ProcessResponse(200, $newContent);
    }

    static function processAfterConnector(string $method, &$content, array &$settings): ProcessResponse
    {
      $stringify = array_get($settings, 'stringify', false);
      if($stringify){
        $parsedContent = json_decode($content, true);
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
