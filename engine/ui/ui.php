<?php
function renderInputs(string $uri)
{
    $variableNameMatches = [];

    preg_match_all('/\$(\w+)/', rawurldecode($uri), $variableNameMatches); //TODO match ${variableName}

    $variableNames = $variableNameMatches[1];
    $body = '';
    foreach ($variableNames as $variableName) {
        $options = [
            'display' => 'input',
            'name' => $variableName
        ];
        $body .= '<script>xyz.ui(' . json_encode($options) . ');</script>';
    }
    return $body;
}

class UiRequest extends HttpRequest2
{

    public function createResponse()
    {
        $path = explode('/', $this->uri);
        $entityClassName = count($path) > 0 ? $path[0] : '';
        $entityId = count($path) > 1? $path[1] : '*';
        $propertyPath = count($path) > 2 ? array_slice($path, 2) : [];

        $rootUri = 'http://localhost:8000/';//TODO proper location

        $menuItems = [];
        $displayNames = ["create","edit","delete"];
        foreach (glob('{./engine/core,./custom/main}/displays/*', GLOB_BRACE) as $file) {
            $displayName = basename($file, '.js');
            $displayNames[] = $displayName;
        }

        if ($entityClassName === '') { //TODO
            $body = '<h3>Choose an entity class:</h3><ul>';
            foreach (glob('{./engine/core,./custom/*}/entities/*.json', GLOB_BRACE) as $file) {
                $entityClassName = basename($file, '.json');
                $body .= '<li><a href="' . $rootUri . 'ui/' . $entityClassName . '">' . $entityClassName . '</a></li>';
            }
            $body .= '</ul> ';
        } else {
            $optionSchemas = [];

            $defaulltOptions = [
                'display' => ["info"=>"How to display the data.","type" => "enum", "choices" => $displayNames]
            ];
            foreach (glob('{./engine/core,./engine/main}/displays/*', GLOB_BRACE) as $dir) {
              $displayName = basename($dir, '');
              $optionSchemas[$displayName] = json_decode(file_get_contents($dir.'/'.$displayName.'.json'), true);
              $optionSchemas[$displayName]['options'] = array_merge($defaulltOptions, $optionSchemas[$displayName]['options']);
            }

            $body = '';
            $body .= renderInputs($this->uri);
            $body .= renderInputs($this->queryString);
            if ($body !== '') $body .= '<br/>';
            $body .= '<div id="xyz-ui-display"></div>

            <pre id="xyz-ui-display-macro"></pre>

            <table id="xyz-ui-display-options" class="xyz-list"></table>

            <script>
            const optionSchemas = '. json_encode($optionSchemas).';
            '.file_get_contents('./engine/ui/ui.js').'
            </script>
            ';
        }
        return new DocResponse('ui' . $this->uri, $body, $menuItems);
    }
}
