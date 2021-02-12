<?

//TODO use entity classes and properties to define sql types and defaults

function createTable(string $entityClassName, $content){
  $tables = "CREATE TABLE `".$entityClassName."`".PHP_EOL;
  $tables .= "  `ID` var_char(16) NOT NULL PRIMARY KEY AUTOINCREMENT".PHP_EOL; // TOOD var_char length
  $firstEntity = true;
  $inserts ="INSERT INTO `".$entityClassName."` (";
  $values = " VALUES ";
  foreach($content as $entityId => $entityIdContent){
    if(!$firstEntity) $values.= ', ';
    $values.="\n (";
    if(is_array($entityIdContent)){
      $firstProperty = true;
      foreach($entityIdContent as $propertyName => $propertyContent){
        if($firstEntity) {
          if(!$firstProperty){$inserts .=",";}
          $tables .= ", `".$propertyName."` var_char(16)".PHP_EOL; // TODO type &  default
          $inserts .= "`".$propertyName."`";
        }
        if(!$firstProperty){$values .=",";}
        $values.= json_encode($propertyContent); // TODO enscape for sql?
        $firstProperty=false;
      }
    }else {
      if($firstEntity) $tables .= ", `value` var_char(16)".PHP_EOL; // TODO type & default
      $values.= json_encode($entityIdContent); // TODO enscape for sql?
    }
    $values.=")";
    $firstEntity = false;
  }
  $inserts.=")";
  return $tables .PHP_EOL.$inserts.$values.PHP_EOL.PHP_EOL;
}


function outputSQL(&$content, Query &$query, array& $path){
  $entityClassNameList = array_get($path,0,'*');
  $entityIdList = array_get($path,1,'*');

  $multipleEntityClasses = $query->checkToggle('expand') || $entityClassNameList === '*' || strpos($entityClassNameList, ',') !== false;
  $multipleEntityIds = $query->checkToggle('expand') || $entityIdList === '*' || strpos($entityIdList, ',') !== false;

  if($multipleEntityClasses){
    $body = '';
    foreach($content as $entityClassName => $entityClassContent){
      $body .= createTable($entityClassName, $entityClassContent);
    }
    return $body;
  } else if($multipleEntityIds) return createTable($entityClassNameList, $content);
  else return createTable($entityClassNameList, [$entityIdList =>$content] );
}
