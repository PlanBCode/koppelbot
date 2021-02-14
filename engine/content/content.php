<?php

function replaceXyzTag($fileContent): string
{
    // '<xyz a="b" c />'
    $pattern = '/<(xyz|XYZ)((\s+(\w+)(="([^"]*?)")?)+)\s*\/>/';
    $fileContent = preg_replace_callback(
        $pattern,
        function ($xyzTagMatches) {
            $attributeString = $xyzTagMatches[2];
            $attributeMatches = [];
            // 'a="b"' or without value/toggle: 'c'
            preg_match_all('/(\w+)(="([^"]*?)")?/', $attributeString, $attributeMatches);
            $count = count($attributeMatches[0]);
            $attributeNames = $attributeMatches[1];  // 'a' or 'c'
            $attributeHasValues = $attributeMatches[2];  // '="b"'
            $attributeValues = $attributeMatches[3]; // 'b'
            $options = [];
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
                    json_set($optionIterator, [$optionName], $attributeValue);
                }
            }
            return '<script>xyz.ui(' . json_encode($options, JSON_UNESCAPED_SLASHES) . ');</script>';
        },
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
    public function createResponse(): ContentResponse
    {
        if ($this->uri === '') {
            if (file_exists('custom/main/content/index.html')) {
                $fileContent = file_get_contents('custom/main/content/index.html');
                return new ContentResponse(200, replaceXyzTag($fileContent));
            } else {
                return new ContentResponse(200, 'Hello World');
            }
        } elseif (endsWith($this->uri, '/xyz-style.css')) {
            $fileContent = file_get_contents('engine/ui/style.css');
            return new ContentResponse(200, $fileContent);
        } elseif (endsWith($this->uri, '/xyz-ui.js')) {
            $fileContent = file_get_contents('engine/ui/xyz-ui.webpacked.js');
            return new ContentResponse(200, $fileContent);
        } elseif ($fileName = isCustomContent($this->uri)) {
            $fileContent = file_get_contents($fileName);//TODO make safe!
            if (pathinfo($fileName, PATHINFO_EXTENSION) === 'html') {
                $fileContent = replaceXyzTag($fileContent);
            }
            return new ContentResponse(200, $fileContent);
        } elseif (file_exists('custom/main/content' . $this->uri)) {
            $fileContent = file_get_contents('custom/main/content' . $this->uri);//TODO make safe!
            if (pathinfo('custom/main/content' . $this->uri, PATHINFO_EXTENSION) === 'html') {
                $fileContent = replaceXyzTag($fileContent);
            }
            return new ContentResponse(200, $fileContent);
        } elseif (file_exists('custom/main/content/404.html')) {
            $fileContent = file_get_contents('custom/main/content/404.html');
            return new ContentResponse(404, $fileContent);
        } else {
            return new ContentResponse(404, 'Page Not Found');//TODO use (default) error page
        }
    }
}

class ContentResponse extends HttpResponse2
{
    public function __construct(int $status, string $content)
    {
        parent::__construct($status, $content);
    }
}
