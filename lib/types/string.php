<?php

class Type_string extends Type
{

    public function validate($value, array $settings): bool
    {
        return true;
    }

    public function getUiComponentHtml(string $propertyName, string $action, string $entityId, $content, array $settings, Query $query): string
    {
        //TODO pass or generate and use id
        if ($action === 'edit') {
            $html = '';
            $html .= '<input';
            if ($content) {
                $html .= ' value="' . $content . '"';
            }
            /* TODO
               placeholder
               default
               regex validation
                min/max length
               flavor settings
             */
            $html .= '/>';
        } else {
            $html = '<span>' . $content . '</span>';
        }

        return $html;
    }
}
