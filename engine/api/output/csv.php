<?

function outputCSV(&$content, Query &$query, array& $path){
  $body = '';
  $entityClassNameList = array_get($path,0,'*');
  $entityIdList = array_get($path,1,'*');

  $multipleEntityClasses = $query->checkToggle('expand') || $entityClassNameList === '*' || strpos($entityClassNameList, ',') !== false;
  $multipleEntityIds = $query->checkToggle('expand') || $entityIdList === '*' || strpos($entityIdList, ',') !== false;

  if($multipleEntityClasses){

    foreach($content as $entityClassName => $entityClassContent){
      foreach($entityClassContent as $entityId => $entityIdContent){
        $line = '"'.$entityClassName.'","'.$entityId.'"';
        $header = '"class","id"';
        if(is_array($entityIdContent)){
          foreach($entityIdContent as $propertyName => $propertyContent){  // TODO how to handle this? classes may not have similar properties
            $header.=',"'.$propertyName.'"';
            $line .= ','.json_encode($propertyContent);
          }
        }else $line .= ','.json_encode($entityIdContent);
        $body.=$line.PHP_EOL;
      }
    }
  }else if($multipleEntityIds){
    foreach($content as $entityId => $entityIdContent){
      $line = '"'.$entityId.'"';
      $header = '"'.$entityClassNameList.'"';
      if(is_array($entityIdContent)){
        foreach($entityIdContent as $propertyName => $propertyContent){
          $line .= ','.json_encode($propertyContent);
          $header.=',"'.$propertyName.'"';
        }
      }else $line .= ','.json_encode($entityIdContent);
      $body.=$line.PHP_EOL;
    }
  }else{
    $line = '';
    $header = '';
    if(is_array($content)){
      $first = true;
      foreach($content as $propertyName => $propertyContent){
        if(!$first) {
          $header .= ',';
          $line .= ',';
        }
        $header.='"'.$propertyName.'"';
        $line.= json_encode($propertyContent);
        $first= false;
      }
    }else $line .= ','.json_encode($content);
    $body.=$line.PHP_EOL;
  }
  return $header.PHP_EOL.$body; // TODO if output-csv-includeHeaders!==false
}
