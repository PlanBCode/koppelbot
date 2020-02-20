<?php

class Type_login extends Type
{
    public static function validateContent($content, array $settings): bool
    {
        if (!is_array($content)) return false;
        if (!array_key_exists('username', $content)) return false;
        if (!array_key_exists('password', $content)) return false;
        if (!is_string($content['username'])) return false;
        if (!is_string($content['password'])) return false;
        if ($content['username'] === $content['password']) return false;
        return true;  // TODO min/max length, allow chars, regex
    }

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        switch ($method) {
            case 'PUT' :  // create new password $newContent = {new: "$password", confirm: "$password"}
                if (!is_array($newContent)) return new ProcessResponse(400, $newContent, 'Expected object.');
                if (!array_key_exists('username', $newContent)) new ProcessResponse(400, $newContent, 'Missing username');
                if (!array_key_exists('password', $newContent)) return new ProcessResponse(400, $newContent, 'Missing  password.');
                if (!is_string($newContent['username'])) new ProcessResponse(400, $newContent, 'Expected username to be a string.');
                if (!is_string($newContent['password'])) new ProcessResponse(400, $newContent, 'Expected password to be a string.');
                $hash = password_hash($newContent['password'], PASSWORD_DEFAULT);
                return new ProcessResponse(200, $hash);
            case 'PATCH' :
                $message = 'Cannot edit login';
                return new ProcessResponse(400, $message);
            default:
                return new ProcessResponse(200, $newContent);
        }
    }
}
