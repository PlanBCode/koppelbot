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
            $attributes = [];
            for ($i = 0; $i < $count; ++$i) {
                $attributes[$attributeNames[$i]] = $attributeValues [$i];
            }
            return '<script>xyz.ui('.json_encode($attributes,JSON_UNESCAPED_SLASHES).');</script>';
        },
        $fileContent
    );
    return $fileContent;
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
        } elseif ($this->uri == '/xyz-style.css') {
            $fileContent = file_get_contents('engine/ui/style.css');
            return new ContentResponse(200, $fileContent);
        } elseif ($this->uri == '/xyz-ui.js') {
            $fileContent = file_get_contents('engine/ui/xyz-ui.webpacked.js');
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
