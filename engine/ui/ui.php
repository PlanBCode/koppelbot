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
            $body = '<h3>Choose an interaction method:</h3><ul>';
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
        }
        return new DocResponse('ui' . $this->uri, $body, $menuItems);
    }
}



