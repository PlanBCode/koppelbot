<?php

require './lib/types/string.php';

abstract class Type {

    abstract public function validate($value, array $settings) : bool;
}