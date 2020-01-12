<?php

function array_get(array $array, $key, $default = null) {
    return array_key_exists($key, $array) ? $array[$key]: $default;
}

function array_null_get(?array $array, $key) {
    if(is_null($array)){
        return null;
    }
    if(array_key_exists($key, $array) ){
        return $array[$key];
    }elseif(array_key_exists('*', $array) ) {
        return $array['*'];
    }else{
        return null;
    }
}
