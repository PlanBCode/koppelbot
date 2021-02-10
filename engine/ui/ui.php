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
        $display = count($path) > 0 ? $path[0] : '*';
        $entityClassName = count($path) > 1 ? $path[1] : '';
        $entityId = count($path) > 2 ? $path[2] : '*';
        $propertyPath = count($path) > 3 ? array_slice($path, 3) : [];

        $rootUri = 'http://localhost:8000/';//TODO proper location

        $menuItems = [];
        foreach (glob('{./engine/core,./custom/main}/displays/*', GLOB_BRACE) as $file) {
            $displayName = basename($file, '.js');
            $menuItems['ui/' . $displayName] = $displayName;
        }
        $menuItems['ui/edit'] = 'edit';
        $menuItems['ui/create'] = 'create';
        $menuItems['ui/delete'] = 'delete';
        if ($display === '') {
            $body = '<h3>Choose an interaction/display method:</h3><ul>';
            foreach (glob('{./engine/core,./engine/main}/displays/*', GLOB_BRACE) as $file) {
                $displayName = basename($file, '.js');
                $menuItems['ui/' . $displayName] = $displayName;
                $body .= '<li><a href="' . $rootUri . 'ui/' . $displayName . '">' . $displayName . '</a></li>';
            }
            $body .= '<li><a href="' . $rootUri . 'ui/edit">edit</a></li>';
            $body .= '<li><a href="' . $rootUri . 'ui/create">create</a></li>';
            $body .= '<li><a href="' . $rootUri . 'ui/delete">delete</a></li>';
            $body .= '</ul> ';
            $menuItems['ui/edit'] = 'edit';
            $menuItems['ui/create'] = 'create';
        } elseif ($entityClassName === '') {
            $body = '<h3>Choose an entity class:</h3><ul>';
            foreach (glob('{./engine/core,./custom/*}/entities/*.json', GLOB_BRACE) as $file) {
                $entityClassName = basename($file, '.json');
                $body .= '<li><a href="' . $rootUri . 'ui/' . $display . '/' . $entityClassName . '">' . $entityClassName . '</a></li>';
            }
            $body .= '</ul> ';
        } else {
            $optionSchema = [];
            foreach (glob('{./engine/core,./custom/*}/displays/'.$display.'/'.$display.'.json', GLOB_BRACE) as $file) {
              $optionSchema = json_decode( file_get_contents($file), true);
            }
            //TODO other optionSchema's for create, delete, edit and login
            if ($display === 'create') {
                $uri = addQueryString('/' . $entityClassName , $this->queryString);
            } else {
                $propertyUri = count($propertyPath) > 0
                    ? '/' . implode('/', $propertyPath)
                    : '';
                $uri = addQueryString('/' . $entityClassName . '/' . $entityId . $propertyUri , $this->queryString); //TODO proper merge
            }
            $query = new Query($this->queryString);
            $options = array_merge([
                'id'=>'xyz-ui-display',
                'uri' => $uri,
                'display' => $display
            ], $query->getOptions());
            foreach ($options as $optionName => $option) {
                if ($option === 'false') $options[$optionName] = false;
                if ($option === 'true') $options[$optionName] = true;
            }
            $body = '';
            $body .= renderInputs($this->uri);
            $body .= renderInputs($this->queryString);
            if ($body !== '') $body .= '<br/>';
            $body .= '<script>xyz.ui(' . json_encode($options) . ');</script>';
            $body .= '<pre id="xyz-ui-display-macro"></pre>';
            ////$uri.
            if(array_key_exists('options',$optionSchema)){
              $body .='

              <table class="xyz-list">
              <tr class="xyz-list-header"><td>Option</td><td>Description</td><td>Value</td></tr>';
              foreach($optionSchema['options'] as $optionName => $settings){
                $info = array_get($settings, 'info', '<i>No description available.</i>');
                $type = array_get($settings, 'type', 'string');
                $value = array_get($options,$optionName, array_get($settings, 'default',''));
                $body .= '<tr><td>'.$optionName.'</td><td>'.$info.'</td><td>
                  <xyz display="input" id="'.$optionName.'" value="'.$value.'" type="'.$type.'" onChange="rerender(content,subPropertyPath);"';
                foreach($settings as $settingId=>$value){
                  if($settingId!=='info'){
                    if(is_array($value)) $value = implode(',',$value);
                    $body.= ' '.$settingId.'="'.$value.'"';
                  }
                }
                $body .= '/>
                </td></tr>';
              }
              $body .='</table>
              <script>
              const options = ' . json_encode($options) . ';
              const optionSchema = '. json_encode($optionSchema['options']).';
              function match(content, defaultContent){
                return content === defaultContent || typeof defaultContent === "undefined" && content==="";
              }
              function rerender(content,subPropertyPath){
                const optionName = subPropertyPath[0];
                options[optionName] = content;
                const defaultContent = optionSchema[optionName].default;
                if(match(content, defaultContent)) content = undefined;
                xyz.setQueryParameter(optionName,content);
                const WRAPPER = document.getElementById("xyz-ui-display");
                xyz.ui(options,WRAPPER);
                updateMacro();
              }
              function updateMacro(){
                let text = "<xyz";
                for(let optionName in options){
                  let content = options[optionName];
                  if(optionName === "id" || optionName ==="aggregations") continue;
                  if(optionName === "uri"){
                    const [base,queryString] = content.split("?");
                    if(queryString){
                      content = base;
                      let first = true;
                      for(let keyval of queryString.split("&")){
                        const [key,value] = keyval.split("=");
                        if(!optionSchema.hasOwnProperty(key)){
                          if(first){
                            first=false;
                            content+="?";
                          }else content+="&"
                          content+=keyval;
                        }
                      }
                    }
                  }
                  const defaultContent = optionSchema.hasOwnProperty(optionName) ? optionSchema[optionName].default : undefined;
                  if(!match(content, defaultContent)) text+=" "+optionName+"=\""+content+"\"";
                }
                document.getElementById("xyz-ui-display-macro").innerText = text+"/>";
              }
              updateMacro()
              </script>
              ';
            }
        }
        return new DocResponse('ui' . $this->uri, $body, $menuItems);
    }
}
