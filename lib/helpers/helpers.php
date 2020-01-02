<?php

function array_get($array, $key, $default = null) {
    return array_key_exists($key, $array) ? $array[$key]: $default;
}
