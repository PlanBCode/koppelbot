<?php

class Type_date extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        $formatFileContent = file_get_contents('./engine/core/types/date/formats.json');
        $formats = json_decode($formatFileContent, true);
        if (!is_string($content)) return false;
        $format = array_get($settings, 'format');
        $contentIndex = 0;
        for ($formatIndex = 0; $formatIndex < strlen($format); ++$formatIndex) {
            $c = substr($format, $formatIndex, 1);
            if (array_key_exists($c, $formats)) {
                $subSettings = $formats[$c]['settings'];
                $subTypeName = array_get($subSettings, 'type', 'string');
                $subTypeClass = Type::get($subTypeName);
                if ($subTypeName === 'number') {
                    $leadingZeroes = array_get($subSettings, 'leadingZeroes', false);
                    if ($leadingZeroes) {
                        $max = array_get($subSettings, 'max', 0);
                        $length = ceil(log10($max));
                    } else {
                        preg_match('[^0-9]',$content,$matches, PREG_OFFSET_CAPTURE, $contentIndex);
                        if(count($matches)>1){
                            $length = $matches[0][1];
                        }else{
                            $length = strlen($content) - $contentIndex;
                        }
                    }
                } else {
                    //TODO enum/error
                }
                $subContent = substr($content, $contentIndex, $length);
                if (!$subTypeClass::validateContent($subContent, $subSettings)) return false;
            } elseif (substr($content, $contentIndex, 1) !== $c) {
                return false;
            } else {
                ++$contentIndex;
            }
        }
        /*
        foreach ($content as $subContent) {

                return false;
            }
        }*/
        return true;
    }
}
