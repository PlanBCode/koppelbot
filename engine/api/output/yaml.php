<?
function has_string_keys(array $array) {
  return count(array_filter(array_keys($array), 'is_string')) > 0;
}

function outputYAML(&$content, Query &$query, array& $path, $indent = 0 ){
  if(is_null($content)) return 'null';

  if($content === 'true' || $content === 'True'|| $content === 'TRUE'
  || $content === 'false' || $content === 'False'|| $content === 'FALSE'
  || $content === 'null' || $content === 'Null'|| $content === 'NULL'
  || $content === '?' || $content === '-'|| $content === ':')  return '"'.$content.'"';

  if(is_string($content)) {
    if(is_numeric($content)) return '"'.$content.'"';
    $sigil = substr($content,0,1);
    if(strpos($content, "\n") !== false){
      return "|".PHP_EOL .str_repeat(' ',$indent*2). str_replace("\n", "\n".str_repeat(' ',$indent*2), $content).PHP_EOL ;
    } else if(strpos("|<>!'\"@\`#{}[],&?%", $sigil) !== false) return json_encode($content);
    else return $content;
  }
  if(is_numeric($content)) return strval($content);
  if(is_bool($content)) return $content?'true':'false';

  if(is_array($content)){
    $string = '';
    if(has_string_keys($content)){
      foreach ($content as $key => $value) {
        $string .= str_repeat(' ', $indent*2). $key .': ' ;
        if(is_array($value)) $string.=PHP_EOL;
        $string .= outputYAML($value,$query, $path, $indent+1);
        if(substr($string, -strlen(PHP_EOL)) !== PHP_EOL) $string .= PHP_EOL;
      }
    }else{
      foreach ($content as $value) {
        $string .= str_repeat(' ', $indent*2). '- ' ;
        if(is_array($value)) $string.=PHP_EOL;
        $string .= outputYAML($value,$query, $path, $indent+1);
        if(substr($string, -strlen(PHP_EOL)) !== PHP_EOL) $string .= PHP_EOL;
      }
    }
    return $string;
  }
}
