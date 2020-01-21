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
            // TODO an instance of Type_xxx should not be needed, we only use static functions

            if ($typeName === 'type') {
                $typeClass = Type_type::class;
            } else {
                $fileName = './engine/core/types/' . $typeName . '.php'; // TODO or custom/types
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


            }
           /* TODO this does not work without instantiating:
               if (!is_subclass_of($typeClass, 'Type')) {
                echo 'ERROR Type ' . $typeName . ' : class does not extend Type!';
                return null;
            }*/

            self::$types[$typeName] = $typeClass;
            return $typeClass;
        }
    }

    abstract static public function validateContent($content, array $settings): bool;

    static function validateSubPropertyPath(array $subPropertyPath, array $settings): bool
    {
        return false;
    }

    static function signature(array &$settings)
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

class Type_type extends Type
{
    static public function validateContent($content, array $settings): bool
    {
        return true;
    }

    /*static function signature(array &$settings)
    {
        //TODO
    }*/
}
