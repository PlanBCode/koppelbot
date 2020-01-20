<?php

function array_get(array $array, $key, $default = null)
{
    return array_key_exists($key, $array) ? $array[$key] : $default;
}

function array_null_get(?array $array, $key)
{
    if (is_null($array)) {
        return null;
    }
    if (array_key_exists($key, $array)) {
        return $array[$key];
    } elseif (array_key_exists('*', $array)) {
        return $array['*'];
    } else {
        return null;
    }
}

Class JsonActionResponse
{
    /** @var bool */
    protected $success;
    public $content;

    public function __construct(bool $success, &$content = null)
    {
        $this->success = $success;
        $this->content =& $content;
    }

    public function succeeded():bool
    {
        return $this->success;
    }
}

function json_get(&$object, array $keyPath): JsonActionResponse
{
    if (empty($keyPath)) {
        return new JsonActionResponse(true, $object);
    }
    if(!is_array($object)){
        return new JsonActionResponse(false, $object); //TODO add error message
    }
    if (array_key_exists($keyPath[0], $object)) {
        return json_get($object[$keyPath[0]], array_slice($keyPath, 1));
    } else {
        return new JsonActionResponse(false, $object); //TODO add error message
    }
}


function json_set(&$object, array $keyPath, &$content): JsonActionResponse
{
    if (empty($keyPath)) {
        $object = $content;
        return new JsonActionResponse(true);
    }
    if (array_key_exists($keyPath[0], $object)) {
        return json_set($object[$keyPath[0]], array_slice($keyPath, 1),$content);
    } else {
        return new JsonActionResponse(false); //TODO add error message
    }
}
