<?php

Class ProcessResponse
{
    /** @var int */
    protected $status;
    protected $content;
    /** @var string */
    protected $error;

    public function __construct(int $status, &$content = null, string $error = '')
    {
        $this->status = $status;
        $this->content =& $content;
        $this->error = $error;
    }

    public function succeeded(): bool
    {
        return $this->status === 200;
    }

    public function getContent()
    {
        return $this->content;
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    public function getError(): string
    {
        return $this->error;
    }
}

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
                $fileName = './engine/core/types/' . $typeName . '/' . $typeName . '.php'; // TODO or custom/types
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

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        return new ProcessResponse(200, $newContent);
    }

    static function processAfterConnector(string $method, $content, array &$settings): ProcessResponse
    {
        return new ProcessResponse(200, $content);
    }

    static function serve(int $status, &$content): HttpResponse2
    {
        //TODO Content-Type: text/html; charset=UTF-8
        //Content-Type: multipart/form-data; boundary=something
        $stringContent = json_simpleEncode($content);
        return new HttpResponse2($status, $stringContent, ['Content-Type' => 'application/json']);
    }
}

class Type_type extends Type
{
    static public function validateContent($content, array $settings): bool
    {
        return true;
    }
}
