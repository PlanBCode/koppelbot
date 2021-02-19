<?php

class DocRequest extends HttpRequest2
{
    public function createResponse(): DocResponse
    {
        if($this->uri === 'map') return new DocResponse($this->uri, $this->getQuery(), '');
        $fileName = $this->uri === 'doc' ? './engine/doc/doc.html' : './engine/'.$this->uri.'.html';
        if(file_exists($fileName)) return new DocResponse($this->uri, $this->getQuery(), file_get_contents($fileName));
        return new DocResponse($this->uri, $this->getQuery(), 'Page Not Found',404);
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

        'doc/dev' => "Developers",
        'doc/dev/files' => "File structure",

        'doc/dev/display' => "Build a display",
        'doc/dev/display/display' => "Display Class",
        'doc/dev/display/item' => "DisplayItem Class",

        'doc/dev/type' => "Build a type",
        'doc/dev/type/type_js' => "Type Class (js)",
        'doc/dev/type/type_php' => "Type Class (php)",
        'doc/dev/type/item' => "TypeItem Class (js)",
        //TODO 'doc/dev/type/item' => "TypeItem Class (php)",
        'doc/dev/connector' => "Build a connector",
        'doc/dev/connector/connector' => "Connector Class",
        'doc/dev/xyz' => "XYZ Class",
        'doc/dev/javascript' => "Javascript packing",

        'map' => "Site Map",
    ];

    protected function getSiteMap(string $rootUri, Query &$query): string
    {
      $xml = $query->getOption('output')==='xml';
       if($xml){
        $map = '<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
         http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
         xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
      <loc>' . $rootUri . '</loc>
   </url>
';
//      <lastmod>2005-01-01</lastmod>
//      <changefreq>monthly</changefreq>
// <priority>0.8</priority>

      }else{
        $map = '<A href="' . $rootUri . '">Home</a><br/><br/>';
      }

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
            $uri = implode('/', array_slice($path,3,count($path)-5));
            $title = $plugin; //TODO handle nested
          }else{
            if($base==='404.html' || $base==='403.html') continue;
            $depth = substr_count($file, '/')-3;
            $uri = $base; //TODO handle nested
            $title = $base;
          }
        }else if($base === 'index.html'){
          $depth = substr_count($file, '/')-3;
          $uri = $plugin . implode('/', array_slice($path,3,count($path)-5));
          $title =  $plugin; //TODO handle nested
        }else{
          $depth = substr_count($file, '/')-2;
          $uri = $plugin.'/'.$base; //TODO handle nested
          $title =  $base;
        }
        if($xml){
          $map.='   <url>
      <loc>' . $rootUri. $uri . '</loc>
   </url>
';
        }else{
          $A = '<a href="' . $rootUri . $uri . '">' . $uri . '</a>';
          $map.= str_repeat('&nbsp;', 2 * $depth) . $A .'<br/>';
        }
      }


      foreach (self::$menuItems as $uri => $menuItem) {
        $depth = substr_count($uri, '/')+1;
          if($xml){
            $map.='   <url>
      <loc>' . $rootUri. $uri . '</loc>
   </url>
';
          }else{
            if($depth===1) $map .='<br/>';
            $A = '<A href="' . $rootUri . $uri . '">' . $menuItem . '</a>';
            $map .=  str_repeat('&nbsp;', 2 * $depth) . $A . '<br/>';
          }
      }
      if($xml) $map.='</urlset>';

      return $map;
    }

    public function __construct(string $currentUri, Query &$query, $content, int $status = 200, array $headers = [])
    {
        $rootUri = 'http://localhost:8000/';//TODO proper location

        if($query->getOption('output')==='xml' && $currentUri === 'map'){
            $content = $this->getSiteMap($rootUri, $query);
        }else {

          $title = 'XYZ - ' . array_get(self::$menuItems, $currentUri, '');
          $head = '<!DOCTYPE html>
    <html lang="en">
    <head>
      <title>' . $title . '</title >
      <link rel="sitemap" type="application/xml" title="Sitemap" href="' . $rootUri . 'map?output=xml" />
      <link rel="stylesheet" type = "text/css" href="' . $rootUri . 'xyz-style.css" />
      <script src="' . $rootUri . 'xyz-ui.js" ></script >
    </head>';
          if($query->checkToggle('embed')){
            $content =
    $head. '
    <body>
    <div class="xyz-page-content">' . $content . '</div>
    </body>
    </html>';
          } else {
            $currentDepth = substr_count($currentUri, '/');
            $path = explode('/',$currentUri);
            $parentUri = implode('/',array_slice($path,0, count($path)-1));
            $navigation = '<ul>';
            foreach (self::$menuItems as $uri => $menuItem) {
                $depth = substr_count($uri, '/');
                if($depth > $currentDepth +1) continue;
                if($depth >= $currentDepth && substr($uri,0, strlen($parentUri)) !== $parentUri) continue;
                if($depth > $currentDepth && substr($uri,0, strlen($currentUri)) !== $currentUri) continue;

                $A = '<A ' . ($uri === $currentUri ? 'class="xyz-page-navigation-current" ' : '') . 'href="' . $rootUri . $uri . '">' . $menuItem . '</a>';

                if ($depth === 0) {
                    $navigation .= '<li class="xyz-page-navigation-depth-0">' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
                } else {
                    $navigation .= '<li>' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
                }
            }
            if($currentUri === 'map') $content = $this->getSiteMap($rootUri, $query);

            $navigation .= '</ul>';
            $content = $head.
'  <body>
    <div class="xyz-page-header">' . $title . '</div>
    <div class="xyz-page-navigation">' . $navigation . '</div>
    <div class="xyz-page-content">' . $content . '</div>
  </body>
</html>';
        }
    }
    parent::__construct($status, replaceXyzTag($content), $headers);
  }
}
