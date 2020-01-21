<?php

class UiRequest extends HttpRequest2
{

    public function createResponse()
    {
        $query = new Query($this->queryString);
        $path = explode('/', $this->uri);
        $display = count($path) > 0 ? $path[0] : '*';
        $entityClassName = count($path) > 1 ? $path[1] : '';
        $entityId = count($path) > 2 ? $path[2] : '*';
        $propertyPath = count($path) > 3 ? array_slice($path, 3) : [];

        $rootUri = 'http://localhost:8888/site/';//TODO proper location

        if ($display === '') {
            $body = '<h3>Choose an interaction method:</h3><ul>';
            foreach (glob('./engine/core/displays/*.js') as $file) {
                $displayName = basename($file, '.js');
                $body .= '<li><a href="' . $rootUri . 'ui/' . $displayName . '">' . $displayName . '</a></li>';
            }
            $body .= '<li><a href="' . $rootUri . 'ui/create">create</a></li>';
            $body .= '</ul> ';
        } elseif ($entityClassName === '') {
            $body = '<h3>Choose an entity class:</h3><ul>';
            foreach (glob('./custom/main/entities/*.json') as $file) {
                $entityClassName = basename($file, '.json');
                $body .= '<li><a href="' . $rootUri . 'ui/' . $display . '/' . $entityClassName . '">' . $entityClassName . '</a></li>';
            }
            $body .= '</ul> ';
        } else {
            if ($display === 'create') {
                $uri = '/' . $entityClassName;
            } else {
                $uri = '/' . $entityClassName . '/' . $entityId . '/' . implode('/', $propertyPath); //TODO proper merge
            }
            $body = '<script>xyz.ui("' . $uri . '",{display:"' . $display . '"});</script>';
        }


        return new DocResponse('ui' . $this->uri, $body);
    }
}



