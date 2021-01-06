<?php

class Type_password extends Type
{
    public static function validateContent($content, array &$settings): bool
    {
        if (!is_array($content)) return false;
        if (!array_key_exists('new', $content)) return false;
        if (!array_key_exists('confirm', $content)) return false;
        if (!is_string($content['new'])) return false;
        if (!is_string($content['confirm'])) return false;
        if (strlen($content['confirm']) < array_get($settings, 'minLength', 0)) return false;
        if (array_key_exists('maxLength',$settings) && strlen($content['confirm']) > array_get($settings, 'minLength', 0)) return false;
        if ($content['new'] !== $content['confirm']) return false;
        return true;
    }

    static function processBeforeConnector(string $method, &$newContent, &$currentContent, array &$settings): ProcessResponse
    {
        switch ($method) {
            case 'PUT' :  // create new password $newContent = {new: "$password", confirm: "$password"}
                if (!is_array($newContent)) return new ProcessResponse(400, $newContent, 'Expected object.');
                if (!array_key_exists('new', $newContent)) new ProcessResponse(400, $newContent, 'Missing new password.');
                if (!array_key_exists('confirm', $newContent)) return new ProcessResponse(400, $newContent, 'Missing confirmed password.');
                if (!is_string($newContent['new'])) new ProcessResponse(400, $newContent, 'Expected new password to be a string.');
                if (!is_string($newContent['confirm'])) new ProcessResponse(400, $newContent, 'Expected confirm password to be a string.');
                if ($newContent['new'] !== $newContent['confirm']) return new ProcessResponse(400, $newContent, 'New does not match confirmed.');
                $hash = password_hash($newContent['new'], PASSWORD_DEFAULT);
                return new ProcessResponse(200, $hash);
            case 'PATCH' : // edit existing password $newContent = {old: "$oldPassword", new: "$newPassword", confirm: "$newPassword"}
                if (!is_array($newContent)) return new ProcessResponse(400, $newContent, 'Expected object.');
                if (!array_key_exists('new', $newContent)) new ProcessResponse(400, $newContent, 'Missing new password.');
                if (!array_key_exists('old', $newContent)) new ProcessResponse(400, $newContent, 'Missing old password');
                if (!array_key_exists('confirm', $newContent)) return new ProcessResponse(400, $newContent, 'Missing confirmed password.');
                if (!is_string($newContent['new'])) new ProcessResponse(400, $newContent, 'Expected new password to be a string.');
                if (!is_string($newContent['old'])) new ProcessResponse(400, $newContent, 'Expected old password to be a string.');
                if (!is_string($newContent['confirm'])) new ProcessResponse(400, $newContent, 'Expected confirm password to be a string.');
                if ($newContent['new'] !== $newContent['confirm']) return new ProcessResponse(400, $newContent, 'New does not match confirmed.');
                if (!password_verify($newContent['old'], $currentContent)) return new ProcessResponse(403, $newContent, 'Old password is incorrect.');
                $hash = password_hash($newContent['new'], PASSWORD_DEFAULT);
                return new ProcessResponse(200, $hash);
                break;
            default:
                return $newContent;
        }
    }
}
