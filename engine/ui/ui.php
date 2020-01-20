<?php

class UiResponse extends HttpResponse2
{
    public function __construct(string $display, string $entityClassName, string $entityId, array $propertyPath, Query &$query)
    {
        $rootUri = 'http://localhost:8888/site/';//TODO proper location

        if ($display === '') {
            $breadcrumbs = ['' => 'ui'];

            $body = '<h3>Choose an interaction method:</h3><ul>';
            foreach (glob('./engine/core/displays/*.js') as $file) {
                $displayName = basename($file, '.js');
                $body .= '<li><a href="' . $rootUri . 'ui/' . $displayName . '">' . $displayName . '</a></li>';
            }
            $body .= '<li><a href="' . $rootUri . 'ui/create">create</a></li>';
            $body .= '</ul> ';
        } elseif ($entityClassName === '') {
            $breadcrumbs = ['ui' => 'ui', '' => $display];
            $body = '<h3>Choose an entity class:</h3><ul>';
            foreach (glob('./custom/main/entities/*.json') as $file) {
                $entityClassName = basename($file, '.json');
                $body .= '<li><a href="' . $rootUri . 'ui/' . $display . '/' . $entityClassName . '">' . $entityClassName . '</a></li>';
            }
            $body .= '</ul> ';
        } else {
            $breadcrumbs = ['ui' => 'ui', ('ui/' . $display) => $display, '' => $entityClassName];
            if ($display === 'create') {
                $uri = '/' . $entityClassName;
            } else {
                $uri = '/' . $entityClassName . '/' . $entityId . '/' . implode('/', $propertyPath); //TODO proper merge
            }
            $body = '<script>xyz.ui("' . $uri . '",{display:"' . $display . '"});</script>';
        }
        $navigation = '';
        foreach ($breadcrumbs as $uri => $breadcrumb) {
            if ($uri === '') {
                $navigation .= '<b>' . $breadcrumb . '</b> ';
            } else {
                $navigation .= '<a href="' . $rootUri . $uri . '">' . $breadcrumb . '</a> ';
            }
        }

        $content =
            '<html>
            <head>
                <title>xyz: ' . implode(' - ', $breadcrumbs) . '</title >
                <link rel = "stylesheet" type = "text/css" href = "' . $rootUri . 'xyz-style.css" />
                <script type = "text/javascript" src = "' . $rootUri . 'xyz-ui.js" ></script >
            </head >
            <body > ' . $navigation . $body . '</body >
        </html > ';
        parent::__construct(200, $content);
    }
}

