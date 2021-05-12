<?php

class ProcessResponse
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
            if ($typeName === 'type') {
                $typeClass = Type_type::class;
            } else {
                $fileNames = glob('{./engine/core,./custom/*}/types/' . $typeName . '/' . $typeName . '.php', GLOB_BRACE);
                if (count($fileNames) === 0) {
                    echo 'ERROR Type ' . $typeName . ' : file does not exist!';
                    return null;
                }
                $fileName = $fileNames[0];

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
    /**
     * [abstract description]
     * @param Mixed $content [description]
     * @param array $settings [description]
     */
    abstract static public function validateContent(&$content, array &$settings): bool;
    /**
     * [validateSubPropertyPath description]
     * @param  array $subPropertyPath [description]
     * @param  array $settings        [description]
     * @return bool                   [description]
     */
    static function validateSubPropertyPath(array &$subPropertyPath, array &$settings): bool
    {
        return false;
    }

    static function signature(array &$settings): array
    {
        return [];
    }
    /**
     * [sort description]
     * @param  Mixed $content1 [description]
     * @param  Mixed $content2 [description]
     * @param  array  $settings [description]
     * @return int              [description]
     */
    public static function sort(&$content1, &$content2, array &$settings): int
    {
        // first try to parse as numbers
        $number1 = self::toNumber($content1, $settings);
        $number2 = self::toNumber($content2, $settings);
        if (!is_nan($number1) || !is_nan($number2)) {
            return $number1 <=> $number2;
        } else if ((is_string($content1) && is_string($content2))) { //TODO use toString to try this
            return strnatcmp($content1, $content2);
        } else { // fallback to default php behaviour
            return $content1 <=> $content2;
        }
    }
    /**
     * [toNumber description]
     * @param  Mixed $content  [description]
     * @param  array  $settings [description]
     * @return number           [description]
     */
    public static function toNumber(&$content, array &$settings)
    {
        return NAN;
    }
    /**
     * [processBeforeConnector description]
     * @param  string          $method         [description]
     * @param  Mixed          $newContent     [description]
     * @param  Mixed          $currentContent [description]
     * @param  array           $settings       [description]
     * @return ProcessResponse                 [description]
     */
    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        return new ProcessResponse(200, $newContent);
    }
    /**
     * [processAfterConnector description]
     * @param  string          $method   [description]
     * @param  Mixed          $content  [description]
     * @param  array           $settings [description]
     * @return ProcessResponse           [description]
     */
    static function processAfterConnector(string $method, &$content, array &$settings): ProcessResponse
    {
        return new ProcessResponse(200, $content);
    }
    /**
     * [serve description]
     * @param  int           $status  [description]
     * @param  Mixed        $content [description]
     * @return HttpResponse2          [description]
     */
    static function serve(int $status, &$content): HttpResponse2
    {
        //TODO Content-Type: text/html; charset=UTF-8
        //Content-Type: multipart/form-data; boundary=something
        $stringContent = json_simpleEncode($content);
        $headers =['Content-Type' => 'application/json'];
        return new HttpResponse2($status, $stringContent, $headers);
    }

    // lhs==rhs
    static public function operatorEQ($lhs, $rhs): bool
    {
      if(is_string($rhs)){
        return $rhs === '*' || in_array($lhs,explode(',',$rhs));
      }else{
        return $lhs == $rhs;
      }
    }
    // lhs===rhs
    static public function operatorEQQ($lhs, $rhs): bool
    {
      return $lhs == $rhs;
    }
    // lhs!=rhs
    static public function operatorNEQ(&$lhs, &$rhs): bool
    {
        return is_string($rhs)
          ? $rhs !== '*' && !in_array($lhs,explode(',',$rhs))
          : $lhs != $rhs;
    }
    // lhs!==rhs
    static public function operatorNEQQ(&$lhs, &$rhs): bool
    {
        return $lhs != $rhs;
    }
    // lhs<rhs
    static public function operatorLT(&$lhs, &$rhs): bool
    {
        return $lhs < $rhs;
    }
    // lhs>rhs
    static public function operatorGT(&$lhs, &$rhs): bool
    {
        return $lhs > $rhs;
    }
    // lhs<=rhs
    static public function operatorLEQ(&$lhs, &$rhs): bool
    {
        return $lhs <= $rhs;
    }
    // lhs>=rhs
    static public function operatorGEQ(&$lhs, &$rhs): bool
    {
        return $lhs >= $rhs;
    }
    // lhs<>rhs
    static public function operatorIN(&$lhs, &$rhs): bool
    {
        return false;
    }
    // lhs><rhs
    static public function operatorOUT(&$lhs, &$rhs): bool
    {
        return false;
    }
    // lhs>=<rhs
    static public function operatorOVERLAP(&$lhs, &$rhs): bool
    {
        return false;
    }
  }

class Type_type extends Type
{
    static public function validateContent(&$content, array &$settings): bool
    {
        return true;
    }
}
