<?php

require './lib/types/string.php';

abstract class Type {

    abstract public function validate($value, array $settings) : bool;

    abstract public function getUiComponentHtml(string $propertyName, string $action, string $entityId, $content, array $settings, Query $query) : string;
}