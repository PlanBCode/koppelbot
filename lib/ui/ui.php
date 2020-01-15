<?php

class UiResponse extends HttpResponse2
{
    public function __construct(string $display, string $entityClass, string $entityId, array $propertyPath, Query &$query)
    {
        $uri = '/' . $entityClass . '/' . $entityId . '/' . implode('/', $propertyPath); //TODO proper merge
        $rootUri = 'http://localhost:8888/site/';//TODO proper location
        $content =
            '<html>
            <head>
                <title></title>
                <link rel="stylesheet" type="text/css" href="' . $rootUri . 'xyz-style.css"/>
                <script type="text/javascript" src="' . $rootUri . 'xyz-script.js"></script>        
            </head>
            <body>
                <script>xyz.ui("' . $uri . '",{display:"' . $display . '"});</script>
            </body>
        </html>';
        parent::__construct(200, $content);
    }

}
