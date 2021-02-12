<?

//TODO xml schema

function createXML(string $entityClassName, $content){
  $xml = '<'.$entityClassName.">".PHP_EOL;
  foreach($content as $entityId => $entityIdContent){
    $xml .= '  <'.$entityId;
    if(is_array($entityIdContent)){
      foreach($entityIdContent as $propertyName => $propertyContent){
        $xml.= ' '.$propertyName.'='.json_encode($propertyContent).''; // TODO enscape for xml? (arrays?)
      }
      $xml .= '/>';
    }else {
      $xml .= '>';
      $xml .= json_encode($entityIdContent); // TODO enscape for xml?
      $xml .= '</'.$entityId.'>';
    }
    $xml.= PHP_EOL;
  }
  $xml .= '</' .$entityClassName.'>'.PHP_EOL;
  return $xml;
}


function outputXML(&$content, Query &$query, array& $path){
  $entityClassNameList = array_get($path,0,'*');
  $entityIdList = array_get($path,1,'*');

  $multipleEntityClasses = $query->checkToggle('expand') || $entityClassNameList === '*' || strpos($entityClassNameList, ',') !== false;
  $multipleEntityIds = $query->checkToggle('expand') || $entityIdList === '*' || strpos($entityIdList, ',') !== false;

  if($multipleEntityClasses){
    $body = '';
    foreach($content as $entityClassName => $entityClassContent){
      $body .= createXML($entityClassName, $entityClassContent);
    }
    return $body;
  }else if($multipleEntityIds) return createXML($entityClassNameList, $content);
  else return createXML($entityClassNameList, [$entityIdList =>$content]);
}
