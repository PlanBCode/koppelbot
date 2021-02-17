<?php
function addQueryString(string $uri, string $queryString): string
{
    if ($queryString === '') {
        return $uri;
    } else if (strpos($uri, '?') !== false) {
        return $uri . '&' . $queryString;
    } else {
        return $uri . '?' . $queryString;
    }
}

function mergeQueryStrings(string $queryString1, string $queryString2): string
{
    if ($queryString1 === '') return $queryString2;
    if ($queryString2 === '') return $queryString1;
    return $queryString1 . '&' . $queryString2;
}


function array_get(array &$array, $key, $default = null)
{
    return array_key_exists($key, $array) ? $array[$key] : $default;
}

function array_null_get(?array &$array, $key)
{
    if (is_null($array)) return null;
    if (array_key_exists($key, $array)) return $array[$key];
    elseif (array_key_exists('*', $array)) return $array['*'];
    else return null;
}

function endsWith($haystack, $needle)
{
    $length = strlen($needle);
    if ($length == 0) return true;
    return (substr($haystack, -$length) === $needle);
}

function array_startsWith(array &$a, array &$b)
{
    $countA = count($a);
    $countB = count($b);
    if ($countA < $countB) return false;
    for ($i = 0; $i < $countB; ++$i) {
        if ($a[$i] !== $b[$i]) return false;
    }
    return true;
}

function json_simpleEncode(&$content): string
{
    if (is_string($content)) {
        return $content;
    } elseif (is_numeric($content)) {
        return strval($content);
    } elseif (is_bool($content)) {
        return $content ? true : false;
    } else {
        return json_encode($content, JSON_PRETTY_PRINT);
    }
}

class JsonActionResponse
{
    /** @var bool */
    protected $success;
    public $content;

    public function __construct(bool $success, &$content = null)
    {
        $this->success = $success;
        $this->content =& $content;
    }

    public function succeeded(): bool
    {
        return $this->success;
    }
}

function json_get(&$object, array &$keyPath): JsonActionResponse
{
    if (empty($keyPath)) {
        return new JsonActionResponse(true, $object);
    }
    if (!is_array($object)) {
        return new JsonActionResponse(false, $object); //TODO add error message
    }
    if (array_key_exists($keyPath[0], $object)) {
        return json_get($object[$keyPath[0]], array_slice($keyPath, 1));
    } else {
        return new JsonActionResponse(false, $object); //TODO add error message
    }
}

function json_set(&$object, array &$keyPath, &$content): JsonActionResponse
{
    if (empty($keyPath)) {
        $object = $content;
        return new JsonActionResponse(true);
    }
    if (array_key_exists($keyPath[0], $object)) { // TODO first check if array?
        return json_set($object[$keyPath[0]], array_slice($keyPath, 1), $content);
    } elseif (is_array($object)) {
        if (count($keyPath) === 1) {
            $object[$keyPath[0]] = $content;
            return new JsonActionResponse(true);
        } else {
            $object[$keyPath[0]] = [];
            return json_set($object[$keyPath[0]], array_slice($keyPath, 1), $content);
        }
    } else {
        return new JsonActionResponse(false); //TODO add error message
    }
}

function isAssociativeArray(array &$arr)
{
    if (array() === $arr) return false;
    return array_keys($arr) !== range(0, count($arr) - 1);
}

function json_unset(&$object, array &$keyPath): JsonActionResponse
{
    if (empty($keyPath)) {
        return new JsonActionResponse(false); // TODO error message cannot delete prime
    }
    if (array_key_exists($keyPath[0], $object)) {
        if (count($keyPath) === 1) {
            if (isAssociativeArray($object)) {  // ["a"=>1,"c"=>"a"]
                unset($object[$keyPath[0]]);
            } else {  // [1,2,3]
                array_splice($object, intval($keyPath[0]), 1);
            }
            return new JsonActionResponse(true);
        } else {
            return json_unset($object[$keyPath[0]], array_slice($keyPath, 1));
        }
    } else {
        return new JsonActionResponse(false); //TODO add error message
    }
}

function json_search(&$object, string $needle): bool
{
    if (is_array($object)) {
        foreach ($object as &$subObject) {
            if (json_search($subObject, $needle)) return true;
        }
        return false;
    } else {
        return strpos(strval($object), $needle) !== false;
    }
}
