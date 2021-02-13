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
            'name' => $variableName,
            'showLabel' => false
        ];
        $body .= '<tr><td>'.$variableName.'</td><td><script>xyz.ui(' . json_encode($options) . ');</script></td></tr>';
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

        $displayNames = ["create","edit","delete"];
        foreach (glob('{./engine/core,./custom/main}/displays/*', GLOB_BRACE) as $file) {
            $displayName = basename($file, '.js');
            $displayNames[] = $displayName;
        }

        $optionSchemas = [];

        $defaulltOptions = [
            'display' => ["info"=>"How to display the data.","type" => "enum", "choices" => $displayNames]
        ];
        foreach (glob('{./engine/core,./engine/main}/displays/*', GLOB_BRACE) as $dir) {
          $displayName = basename($dir, '');
          $optionSchemas[$displayName] = json_decode(file_get_contents($dir.'/'.$displayName.'.json'), true);
          $optionSchemas[$displayName]['options'] = array_merge($defaulltOptions, $optionSchemas[$displayName]['options']);
        }

        require_once __DIR__ . '/../api/landing.php';

        $body = '';
        if ($body !== '') $body .= '<br/>';
        $body .= '<table class="xyz-list">
          <tr class="xyz-list-header"><td colspan="2" >Result</td></tr>
          <tr><td colspan="2" style="padding:1cm;background-color:darkgrey;"><div id="xyz-ui-display"></div></td></tr>';

        $inputs = renderInputs($this->uri.'?'.$this->queryString);
        if($inputs){
        $body .= '<tr class="xyz-list-header"><td colspan="2">Inputs</td></tr>'
              . $inputs;
        }


        $body .= '</table>

        '.APILandingHtml(false).'

        <table id="xyz-ui-display-options" class="xyz-list"></table>
        <table class="xyz-list">
          <tr class="xyz-list-header"><td>UI Macro</td></tr>
          <tr><td>
          <select id="xyz-ui-display-macroFlavor" onchange="onUiChange();">
            <option value="ui">ui</option>
            <option value="api">api</option>
            <option value="embed">embed</option>
          </select>
          </td></tr>
          <tr><td style="padding:1cm;" ><pre id="xyz-ui-display-macro"></pre></td></tr>
        </table>
        <script>
        const optionSchemas = '. json_encode($optionSchemas).';
        '.file_get_contents('./engine/ui/ui.js').'
        </script>
        ';

        return new DocResponse('ui' . $this->uri, $body);
    }
}
