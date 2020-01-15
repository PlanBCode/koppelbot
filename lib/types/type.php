<?php

abstract class Type
{
    /** @var Type[] */
    static $types = [];

    static public function get(string $typeName)
    {
        if (array_key_exists($typeName, self::$types)) {
            return self::$types[$typeName];
        } else {

            $fileName = './lib/types/' . $typeName . '.php'; // TODO or custom/types
            if (!file_exists($fileName)) {
                echo 'ERROR Type ' . $typeName . ' : file does not exist!';
                return null;
            }

            require_once $fileName;

            $typeClass = 'Type_' . $typeName;
            if (!class_exists($typeClass)) {
                echo 'ERROR Type ' . $typeName . ' : class is not defined!';
                return null;
            }

            $type = new $typeClass();
            self::$types[$typeName] = $type;
            return $type;
        }
    }

    abstract static public function validate($value, array $settings): bool;

    static function signature()
    {
        $className = get_called_class();
        if (substr($className, 0, 5) === 'Type_') {
            return substr($className, 5);
        } else {
            //TODO
            return 'SIGNATURE ERROR';
        }
    }
}