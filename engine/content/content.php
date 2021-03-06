<?php
require('mime.php');

$replaceXyzTag = function ($xyzTagMatches) {
    $attributeString = $xyzTagMatches[2];  // '<xyz a="b" c ...' -> 'a="b" c ...'
    $innerHTML = array_get($xyzTagMatches,7,null); // '<xyz ...>bla</xyz>' -> 'bla'
    $attributeMatches = [];
    // 'a="b"' or without value/toggle: 'c'
    preg_match_all('/(\w+)(="([^"]*?)")?/', $attributeString, $attributeMatches);
    $count = count($attributeMatches[0]);
    $attributeNames = $attributeMatches[1];  // 'a' or 'c'
    $attributeHasValues = $attributeMatches[2];  // '="b"'
    $attributeValues = $attributeMatches[3]; // 'b'
    $options = is_null($innerHTML) ? [] : ['innerHTML' => $innerHTML];

    for ($i = 0; $i < $count; ++$i) {
        $attributeName = $attributeNames[$i];
        $attributeValue = $attributeHasValues[$i] ? $attributeValues[$i] : 'true'; // an attribute without value is set to true
        $attributePath = explode('_', $attributeName); // "property_subOption" -> ["property","subOption"]
        $attributePathLength = count($attributePath);
        if ($attributePathLength === 1) { // optionName="value" -> options[optionName]="value"
            $options[$attributeName] = $attributeValue;
        } else {  // propertyName_optionName="value" -> options[subOptions][propertyName][optionName]="value"
            $optionIterator =& $options;
            for ($depth = 0; $depth < $attributePathLength - 1; ++$depth) {
                $propertyName = $attributePath[$depth];
                if (!array_key_exists('subOptions', $optionIterator)) $optionIterator['subOptions'] = [];
                if (!array_key_exists($propertyName, $optionIterator['subOptions'])) $optionIterator['subOptions'][$propertyName] = [];
                $optionIterator =& $optionIterator['subOptions'][$propertyName];
            }
            $optionName = $attributePath[$attributePathLength - 1];
            $path = [$optionName];
            json_set($optionIterator, $path, $attributeValue);
        }
    }
    return '<script>xyz.ui(' . json_encode($options, JSON_UNESCAPED_SLASHES) . ');</script>';
};

function replaceXyzTags($fileContent): string
{
    global $replaceXyzTag;
    // '<xyz a="b" c />'
    $pattern = '/<(xyz|XYZ)((\s+(\w+)(="([^"]*?)")?)+)\s*\/>/';
    $fileContent = preg_replace_callback(
        $pattern,
        $replaceXyzTag,
        $fileContent
    );
    // '<xyz a="b" c>bla</xyz>'
    $pattern = '/<(xyz|XYZ)((\s+(\w+)(="([^"]*?)")?)+)\s*>(.*)<\/xyz>/';
    $fileContent = preg_replace_callback(
        $pattern,
        $replaceXyzTag,
        $fileContent
    );
    return $fileContent;
}

function isCustomContent(string $uri)
{
    $path = explode('/', $uri);
    if (count($path) <= 1) return '';
    $plugin = $path[1];
    if (count($path) === 2) {
        $fileName = 'custom/' . $plugin . '/content/index.html';
    } else {
        $subUri = array_slice($path, 2);
        $fileName = 'custom/' . $plugin . '/content/' . implode('/', $subUri);
    }
    return file_exists($fileName) ? $fileName : '';
}

class ContentRequest extends HttpRequest2
{
    protected function getContentFileResponse(string $fileName, int $status = 200)
    {
      if(strpos($fileName,'..') !== false) return new ContentResponse(403, 'Forbidden');
      $mime = getMimeContentType($fileName);
      $headers = ['Content-Type'=>$mime];
      $fileContent = file_get_contents($fileName);
      //TODO insert sitemap into html header
      //TODO insert xyz js (only if there are xyz tags)
      if(pathinfo($fileName, PATHINFO_EXTENSION) === 'html') $fileContent = replaceXyzTags($fileContent);

      // handle gzip encoding
      /*if(array_key_exists('Accept-Encoding',$this->headers)){
        foreach(explode(',',$this->headers['Accept-Encoding']) as &$encoding){
          $x = explode(';',$encoding);
          $algorithm = $x[0];
          $arguments = $x[1];
          //if( $algorithm === 'gzip') $headers['Content-Encoding'] = 'gzip';
        }
      }*/

      return new ContentResponse($status, $fileContent, $headers);
    }

    public function createResponse(): ContentResponse
    {
        if ($this->uri === '') {
            if (file_exists('custom/main/content/index.html')) {
                return $this->getContentFileResponse('custom/main/content/index.html', true);
            } else {
                return new ContentResponse(200, 'Hello World');
            }
        } elseif (endsWith($this->uri, '/xyz-style.css')) {
            return $this->getContentFileResponse('engine/ui/style.css');
        } elseif (endsWith($this->uri, '/xyz-ui.js')) {
            return $this->getContentFileResponse('engine/ui/xyz-ui.webpacked.js');
        } elseif ($fileName = isCustomContent($this->uri)) {
            return $this->getContentFileResponse($fileName);//TODO make safe!
        } elseif (file_exists('custom/main/content' . $this->uri)) {
            return $this->getContentFileResponse('custom/main/content' . $this->uri);//TODO make safe!
          } elseif (file_exists('engine/core/content' . $this->uri)) {
              return $this->getContentFileResponse('engine/core/content' . $this->uri);//TODO make safe!
        } elseif (file_exists('custom/main/content/404.html')) {
            return $this->getContentFileResponse('custom/main/content/404.html',404);
        } else {
            return new ContentResponse(404, 'Page Not Found');//TODO use (default) error page
        }
    }
}

class ContentResponse extends HttpResponse2
{
    public function __construct(int $status, string $content, array &$headers=[])
    {
        parent::__construct($status, $content, $headers);
    }
}
