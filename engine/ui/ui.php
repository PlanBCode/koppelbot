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

        $defaultOptions = [
          'display' => ["info"=>"How to display the data.","type" => "enum", "choices" => $displayNames, "default" => "list"],
          'dynamic' => ["info"=>"Whether to refresh the data continously.","type" => "bool", "default" => false],
          'style' => ["info"=>"CSS styling.","type" => "string"],
        ];
        foreach (glob('{./engine/core,./engine/main}/displays/*', GLOB_BRACE) as $dir) {
          $displayName = basename($dir, '');
          $optionSchemas[$displayName] = json_decode(file_get_contents($dir.'/'.$displayName.'.json'), true);
          $optionSchemas[$displayName]['options'] = array_merge($defaultOptions, $optionSchemas[$displayName]['options']);
        }
        if($this->query->checkToggle('embed')) {
          $body =  '<div id="xyz-ui-display"></div>
          <script>
            const optionSchemas = '. json_encode($optionSchemas).';
            '.file_get_contents('./engine/ui/ui.js').'
            </script>';

            return new DocResponse('ui' . $this->uri, $this->getQuery(), $body, 200, ["Content-Security-Policy"=> "frame-ancestors *"]);
        } else {

          require_once __DIR__ . '/../api/landing.php';

          $body = '<p>This page offers an interface to create and test data displays.

          For more information please visit: <a href="/doc/ui">UI reference</a>.</p>';

          $body .= '<table class="xyz-list">
            <tr id="xyz-ui-result-header" class="xyz-list-header xyz-list-foldable"><td colspan="2" >Result</td></tr>
            <tr><td colspan="2" style="overflow: scroll; padding:1cm;background-color:darkgrey;"><div id="xyz-ui-display"><div style="text-align:center;color:grey;">Waiting for input</div></div></td></tr>';

          $inputs = renderInputs($this->uri.'?'.$this->queryString);
          if($inputs){
          $body .= '<tr class="xyz-list-header xyz-list-foldable xyz-list-folded"><td colspan="2">Inputs</td></tr>'
                . $inputs;
          }


          $body .= '</table>

          '.APILandingHtml(false).'

          <table id="xyz-ui-display-options" class="xyz-list"><tr class="xyz-list-header xyz-list-foldable xyz-list-folded" id="xyz-ui-options-header"><td>Display Option</td><td>Description</td><td>Value</td></tr></table>
          <table class="xyz-list">
            <tr id="xyz-ui-macro-header" class="xyz-list-header xyz-list-foldable xyz-list-folded"><td>UI Macro</td></tr>
            <tr><td>
            <select id="xyz-ui-display-macroFlavor" onchange="onUiChange();">
              <option value="ui">ui</option>
              <option value="api">api</option>
              <option value="embed">embed</option>
            </select>
            </td></tr>
            <tr><td style="padding:1cm;" ><pre id="xyz-ui-display-macro"style=" white-space: normal;"></pre></td></tr>
            <tr><td><table  class="xyz-list" id="xyz-ui-display-variables"></table></td></tr>
          </table>
          <script>
          const optionSchemas = '. json_encode($optionSchemas).';
          '.file_get_contents('./engine/ui/ui.js').'
          </script>
          ';
          $query = $this->getQuery();
          return new DocResponse('ui' . $this->uri, $query, $body);
        }
    }
}
