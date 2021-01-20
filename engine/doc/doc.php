<?php

class DocRequest extends HttpRequest2
{
    public function createResponse(): DocResponse
    {
        $fileName = $this->uri === 'doc' ? './engine/doc/doc.html' : './engine/'.$this->uri.'.html';
        $content = file_exists($fileName) ? file_get_contents($fileName) : 'Work in progress...';
        return new DocResponse($this->uri, $content);
    }
}

class DocResponse extends HttpResponse2
{
    static protected $menuItems = [
        'doc' => "Documentation",
        'doc/api' => "API Reference",
        'doc/api/entities' => "Entities",
        'doc/api/types' => "Types",

        'doc/ui' => "UI Reference",
        'doc/ui/displays' => "Displays",
        'doc/ui/templates' => "HTML templates",
        'doc/ui/types' => "Types",

        'api' => "Rest API",
        'ui' => "User Interface"
    ];

    protected function spliceInExtraMenuItems($extraMenuItems){
        if (!empty($extraMenuItems)) {
            $firstExtraMenuItemUri = array_keys($extraMenuItems)[0];
            $index = 1;
            foreach (self::$menuItems as $uri => $menuItem) {
                if (strpos($firstExtraMenuItemUri, $uri . '/') === 0) {
                    return  array_slice(self::$menuItems, 0, $index, true) +
                        $extraMenuItems +
                        array_slice(self::$menuItems, $index, true);
                }
                ++$index;
            }
        }else{
            return self::$menuItems;
        }
    }

    public function __construct(string $currentUri, $content, $extraMenuItems = [])
    {
        $rootUri = 'http://localhost:8000/';//TODO proper location


        $menuItems = $this->spliceInExtraMenuItems($extraMenuItems);

        $title = 'XYZ - ' . array_get(self::$menuItems, $currentUri, '');

        $navigation = '<ul>';
        foreach ($menuItems as $uri => $menuItem) {
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
        parent::__construct(200, replaceXyzTag($content));
    }
}
