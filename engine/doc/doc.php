<?php

class DocRequest extends HttpRequest2
{
    public function createResponse(): DocResponse
    {
        return new DocResponse($this->uri, 'Lorem ipsum');
    }
}

class DocResponse extends HttpResponse2
{
    static protected $menuItems = [
        'doc' => "Documentation",
        'doc/api' => "API Reference",
        'doc/ui' => "UI Reference",
        'api' => "Rest API",
        'ui' => "User Interface",
    ];

    public function __construct(string $currentUri, $content)
    {
        $rootUri = 'http://localhost:8888/site/';//TODO proper location


        $title = 'XYZ - ' . array_get(self::$menuItems, $currentUri,'');

        $navigation = '<ul>';
        foreach (self::$menuItems as $uri => $menuItem) {
            $depth = substr_count($uri, '/');
            $A = '<A ' . ($uri === $currentUri ? 'class="xyz-page-navigation-current"' : '') . 'href="' . $rootUri . $uri . '">' . $menuItem . '</a>';

            if ($depth === 0) {
                $navigation .= '<li class="xyz-page-navigation-depth-0">' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
            } else {
                $navigation .= '<li>' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
            }
        }
        $navigation .= '</ul>';
        $content =
            '<html>
            <head>
                <title> ' . $title . '</title >
                <link rel = "stylesheet" type = "text/css" href = "' . $rootUri . 'xyz-style.css" />
                <script type = "text/javascript" src = "' . $rootUri . 'xyz-ui.js" ></script >
            </head >
            <body > 
            <div class="xyz-page-header">' . $title . '</div>
            <div class="xyz-page-navigation">' . $navigation . '</div>
            <div class="xyz-page-content">' . $content . '</div>
            </body >
        </html > ';
        parent::__construct(200, $content);
    }
}

