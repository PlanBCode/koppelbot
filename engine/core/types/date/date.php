<?php

class Type_date extends Type
{
    static protected $formats;

    static protected function loadFormats()//TODO : void
    {
        if (!isset(self::$formats)) {
            $formatFileContent = file_get_contents('./engine/core/types/date/formats.json');
            self::$formats = json_decode($formatFileContent, true);
        }
    }

    public static function sort(&$content1, &$content2, array &$settings): int
    {
        $format = array_get($settings, 'format'); // TODO handle no format specified
        $datetime1 = date_create_from_format($format, $content1); //TODO pass timezone as extra option
        $datetime2 = date_create_from_format($format, $content2); //TODO pass timezone as extra option

        if ($datetime1 == $datetime2) return 0;
        return $datetime1 < $datetime2 ? -1 : 1;
    }

    public static function toNumber(&$content, array &$settings)
    {
        $format = array_get($settings, 'format'); // TODO handle no format specified
        $datetime = date_create_from_format($format, $content); //TODO pass timezone as extra option
        return $datetime->getTimestamp();
    }

    public static function validateContent(&$content, array &$settings): bool
    {
        if (!is_string($content)) return false; //TODO maybe numbers for single date things?

        $format = array_get($settings, 'format');
        if (is_null($format)) return false; // no format specified
        // TODO auto detect format

        self::loadFormats();

        $contentIndex = 0;
        for ($formatIndex = 0; $formatIndex < strlen($format); ++$formatIndex) {
            $c = substr($format, $formatIndex, 1);
            if (array_key_exists($c, self::$formats)) {
                $subSettings = self::$formats[$c]['settings'];
                $subTypeName = array_get($subSettings, 'type', 'string');
                $subTypeClass = Type::get($subTypeName);
                if ($subTypeName === 'number') {
                    $leadingZeroes = array_get($subSettings, 'leadingZeroes', false);
                    if ($leadingZeroes) {
                        $max = array_get($subSettings, 'max', 0);
                        $length = ceil(log10($max));
                    } else {
                        preg_match('/[^0-9]+/', $content, $matches, PREG_OFFSET_CAPTURE, $contentIndex);
                        if (count($matches) > 0) {
                            $length = $matches[0][1];
                        } else {
                            $length = strlen($content) - $contentIndex;
                        }
                    }
                } else {
                    //TODO enum/error
                }
                $subContent = substr($content, $contentIndex, $length);
                if (!$subTypeClass::validateContent($subContent, $subSettings)) {
                    return false;
                }
                $contentIndex += $length;
            } elseif (substr($content, $contentIndex, 1) !== $c) {
                echo substr($content, $contentIndex, 1) . '!==' . $c;
                return false;
            } else {
                ++$contentIndex;
            }
        }
        return true;
    }
}
