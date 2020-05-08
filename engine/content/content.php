<?php

function replaceXyzTag($fileContent): string
{
    $pattern = '/<(xyz|XYZ)((\s+(\w+)="([^"]*?)")+)\s*\/>/';
    $fileContent = preg_replace_callback(
        $pattern,
        function ($xyzTagMatches) {
            $attributeString = $xyzTagMatches[2];
            $attributeMatches = [];
            preg_match_all('/(\w+)="([^"]*?)"/', $attributeString, $attributeMatches);
            $count = count($attributeMatches[0]);
            $attributeNames = $attributeMatches[1];
            $attributeValues = $attributeMatches[2];
            $options = [];
            for ($i = 0; $i < $count; ++$i) {
                $attributeName = $attributeNames[$i];
                $attributeValue = $attributeValues [$i];
                $attributePath = explode('-', $attributeName); // "property-option" -> ["property","option"]
                //if (count($attributePath) === 1) { // optionName="value" -> options[optionName]="value"
                $options[$attributeName] = $attributeValue;
                /*} else {  // propertyName-optionName="value" -> options[subOptions][propertyName][optionName]="value"
                    if (!array_key_exists('subOptions', $options)) $options['subOptions'] = [];
                    json_set($options['subOptions'], $attributePath, $attributeValue);
                }*/
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
