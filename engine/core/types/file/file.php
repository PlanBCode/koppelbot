<?php

class Type_file extends Type
{
    public static function signature(array &$settings): array
    {
        return [
            'id' => ['type' => 'string'],
            'content' => ['type' => 'string'],
            'extension' => ['type' => 'string', 'required' => false],
            'size' => ['type' => 'number', 'required' => false],
            'mime' => ['type' => 'string', 'required' => false]
        ];
    }

    public static function validateContent($value, array $settings): bool
    {
        //todo mime/accept
        //todo max size
        return true;
    }

    static function serve(int $status, &$content): HttpResponse2
    {
        if (!is_array($content) || !array_key_exists('content', $content)
        ) return new HttpResponse2(500, 'Invalid content', []);

        if (is_string($content['content'])) {
            $stringContent = $content['content'];
        } elseif (is_array($content['content']) && array_key_exists('content', $content['content'])) {
            $encoding = array_get($content['content'], 'encoding', 'utf8');
            switch ($encoding) {
                case 'base64' :
                    $stringContent = base64_decode($content['content']['content']);
                    break;
                case 'utf8' :
                    $stringContent = $content['content']['content'];
                    break;
                default:
                    return new HttpResponse2(500, 'Invalid encoding', []);
            }
        } else {
            return new HttpResponse2(500, 'Invalid content', []);
        }
        $headers = [];
        if (array_key_exists('mime', $content)) {
            $headers['Content-Type'] = $content['mime'];
        }
        if (array_key_exists('id', $content)) {
            $fileName = $content['id'];
            $headers ['Content-Disposition'] = 'inline; filename="' . $fileName . '"';
        }
        return new HttpResponse2($status, $stringContent, $headers);
    }
}
