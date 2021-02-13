<?php

class DocRequest extends HttpRequest2
{
    public function createResponse(): DocResponse
    {
        if($this->uri === 'map') return new DocResponse($this->uri, '');
        $fileName = $this->uri === 'doc' ? './engine/doc/doc.html' : './engine/'.$this->uri.'.html';
        if(file_exists($fileName)) return new DocResponse($this->uri, file_get_contents($fileName));
        return new DocResponse($this->uri, 'Page Not Found',404);
    }
}

class DocResponse extends HttpResponse2
{
    static protected $menuItems = [
        'api' => "Rest API",
        'ui' => "User Interface",
        'doc' => "Documentation",
        'doc/api' => "API Reference",
        'doc/api/entities' => "Entities",
        'doc/api/types' => "Types",
        'doc/api/connectors' => "Connectors",

        'doc/ui' => "UI Reference",
        'doc/ui/displays' => "Displays",
        'doc/ui/templates' => "HTML templates",
        'doc/ui/types' => "Types",

        'doc/dev' => "Developers",
        'doc/dev/files' => "File structure",
        'doc/dev/display' => "Build a display",
        'doc/dev/type' => "Build a type",
        'doc/dev/connector' => "Build a connector",
        'doc/dev/javascript' => "Javascript packing",
        'doc/dev/classes' => "Classes",
        'doc/dev/classes/display' => "Display Class",
        'doc/dev/classes/item' => "Item Class",

        'map' => "Site Map",
    ];

    protected function getSiteMap(string $rootUri): string
    {
      //TODO create a xml robots site map
      $map = '<A href="' . $rootUri . '">Home</a><br/><br/>';

      foreach (glob('{./engine/core,./custom/*}/content/**.html', GLOB_BRACE) as $file) {

        $path = explode('/',$file);
        $plugin = $path[2];
        $base =  $path[count($path)-1];
        $uri = implode('/',array_slice($path,4));
        if($plugin === 'main' || $plugin === 'core'){
          if($base === 'index.html'){
            $depth = substr_count($file, '/')-3;
            $uri = $uri;
            if($depth === 1) continue;
            $uri = $base; //TODO handle nested
            $title = $plugin; //TODO handle nested
          }else{
            if($base==='404.html'||$base==='403.html') continue;
            $depth = substr_count($file, '/')-3;
            $uri = $base; //TODO handle nested
            $title = $base; //TODO handle nested
          }
        }else if($base === 'index.html'){
          $depth = substr_count($file, '/')-3;
          $uri = $plugin.'/'.$base; //TODO handle nested
          $title =  $plugin; //TODO handle nested
        }else{
          $depth = substr_count($file, '/')-2;
          $uri = $plugin.'/'.$base; //TODO handle nested
          $title =  $base; //TODO handle nested
        }
        $A = '<a href="' . $rootUri . $uri . '">' . $title . '</a>';
        $map.= str_repeat('&nbsp;', 2 * $depth) . $A .'<br/>';
      }


      foreach (self::$menuItems as $uri => $menuItem) {
        $depth = substr_count($uri, '/')+1;
        if($depth===1) $map .='<br/>';
        $A = '<A href="' . $rootUri . $uri . '">' . $menuItem . '</a>';
        $map .=  str_repeat('&nbsp;', 2 * $depth) . $A . '<br/>';
      }
      return $map;
    }

    public function __construct(string $currentUri, $content, $status = 200)
    {
        $rootUri = 'http://localhost:8000/';//TODO proper location

        $title = 'XYZ - ' . array_get(self::$menuItems, $currentUri, '');
        $currentDepth = substr_count($currentUri, '/');
        $path = explode('/',$currentUri);
        $parentUri = implode('/',array_slice($path,0, count($path)-1));
        $navigation = '<ul>';
        foreach (self::$menuItems as $uri => $menuItem) {
            $depth = substr_count($uri, '/');
            if($depth > $currentDepth +1) continue;
            if($depth >= $currentDepth && substr($uri,0, strlen($parentUri)) !== $parentUri) continue;
            if($depth > $currentDepth && substr($uri,0, strlen($currentUri)) !== $currentUri) continue;

            $A = '<A ' . ($uri === $currentUri ? 'class="xyz-page-navigation-current"' : '') . 'href="' . $rootUri . $uri . '">' . $menuItem . '</a>';



            if ($depth === 0) {
                $navigation .= '<li class="xyz-page-navigation-depth-0">' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
            } else {
                $navigation .= '<li>' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
            }
        }
        if($currentUri === 'map') $content = $this->getSiteMap($rootUri);

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

        parent::__construct($status, replaceXyzTag($content));
    }
}
