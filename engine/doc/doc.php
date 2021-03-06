<?php

class DocRequest extends HttpRequest2
{
    public function createResponse(): DocResponse
    {
        if($this->uri === 'map') return new DocResponse($this->uri, $this->getQuery(), '');
        $fileName = $this->uri === 'doc' ? './engine/doc/doc.html' : './engine/'.$this->uri.'.html';
        $query = $this->getQuery();
        $content= file_get_contents($fileName);
        if(file_exists($fileName)) return new DocResponse($this->uri, $query, $content);
        return new DocResponse($this->uri, $this->getQuery(), 'Page Not Found',404);
    }
}

class DocResponse extends HttpResponse2
{
    static public $menuItems = [
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
        'doc/download' => "Download",
        'doc/tutorial' => "Tutorial",
        'map' => "Site Map"

    ];

    protected function getSiteMap(Query &$query): string
    {
      $protocol = isset($_SERVER["HTTPS"]) ? 'https' : 'http';
      $baseUri = $protocol.'://'.$_SERVER['HTTP_HOST'];

      $xml = $query->getOption('output')==='xml';
       if($xml){
        $map = '<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
         http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
         xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
      <loc>' . $baseUri . '</loc>
   </url>
';
//      <lastmod>2005-01-01</lastmod>
//      <changefreq>monthly</changefreq>
// <priority>0.8</priority>

      }else{
        $map = '<A href="/">Home</a><br/><br/>';
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
      <loc>' . $baseUri. $uri . '</loc>
   </url>
';
        }else{
          $A = '<a href="' . $uri . '">' . $uri . '</a>';
          $map.= str_repeat('&nbsp;', 2 * $depth) . $A .'<br/>';
        }
      }


      foreach (self::$menuItems as $uri => $menuItem) {
        $depth = substr_count($uri, '/')+1;
          if($xml){
            $map.='   <url>
      <loc>' . $baseUri. $uri . '</loc>
   </url>
';
          }else{
            if($depth===1) $map .='<br/>';
            $A = '<A href="' . $uri . '">' . $menuItem . '</a>';
            $map .=  str_repeat('&nbsp;', 2 * $depth) . $A . '<br/>';
          }
      }
      if($xml) $map.='</urlset>';

      return $map;
    }

    public function __construct(string $currentUri, Query &$query, $content, int $status = 200, array $headers = [])
    {

        if($query->getOption('output')==='xml' && $currentUri === 'map'){
            $content = $this->getSiteMap($query);
        }else {

          $title = 'Koppelbot - ' . array_get(self::$menuItems, $currentUri, '');
          $head = '<!DOCTYPE html>
    <html lang="en">
    <head>
      <title>' . $title . '</title >
      <link rel="sitemap" type="application/xml" title="Sitemap" href="/map?output=xml" />
      <link rel="stylesheet" type = "text/css" href="/xyz-style.css" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
      <link rel="manifest" href="/site.webmanifest">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
      <script src="/xyz-ui.js" ></script >
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

                $A = '<A ' . ($uri === $currentUri ? 'class="xyz-page-navigation-current" ' : '') . 'href="/' .  $uri . '">' . $menuItem . '</a>';

                if ($depth === 0) {
                    $navigation .= '<li class="xyz-page-navigation-depth-0">' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
                } else {
                    $navigation .= '<li>' . str_repeat('&nbsp;', 2 * $depth) . $A . '</li>';
                }
            }
            if($currentUri === 'map') $content = $this->getSiteMap($query);

            $navigation .= '</ul>';
            $content = $head.
'  <body>
    <div class="xyz-page-header"><a href="/" class="xyz-logo"></a>' . $title . '</div>
    <div class="xyz-page-navigation"><div class="xyz-page-navigation-background"></div>' . $navigation . '</div>
    <div class="xyz-page-content">' . $content . '</div>
  </body>
</html>';
        }
    }
    $content = replaceXyzTags($content);
    parent::__construct($status, $content, $headers);
  }
}
