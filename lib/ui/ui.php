<?php

class UiResponse extends HttpResponse2
{
    public function __construct(string $action, string $entityClass, string $entityId, string $propertyName, Query $query)
    {
        $entity = new Entity($entityClass); //TODO static
        $content = $entity->getUiComponentHtml($action, $entityId, $propertyName, $query);
        /*
         TODO options for live edit

         */

        if ($query->checkToggle('code')) {
            $html = $content;
        } else {
            if ($action === 'edit') {
                $footer = '<input type="submit"/>';
            } else {
                $footer = '';
            }
            $html = '<html><head><title>' . $action . ' ' . $entityClass . ' ' . $entityId . ' ' . $propertyName . '</title></head><body>' . $content . $footer . '</body></html>';
        }
        parent::__construct(200, $html);
    }

}

