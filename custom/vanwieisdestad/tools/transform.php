<?

$db = new SQLite3('data/mapdata.sqlite');

$queryCreate = "CREATE TABLE `Locaties` (
  `ID` integer NOT NULL PRIMARY KEY AUTOINCREMENT
, `DocumentID` integer NOT NULL DEFAULT '0'
, `EigenaarID` integer NOT NULL DEFAULT '0'
, `type` varchar(32) NOT NULL DEFAULT ''
, `geojson` TEXT NOT NULL DEFAULT ''
);";

$result = $db->query($queryCreate);

$querySelect = 'SELECT ID, EigenaarID, BAG, BRK from Documenten';

$result = $db->query($querySelect);

$queryInsert = 'INSERT INTO Locaties (DocumentID, EigenaarID, geojson, `type`) VALUES ';
$first = true;
while($row = $result->fetchArray()){
  foreach(['BAG','BRK'] as $type){
    $featureCollection = json_decode($row[$type]);
    foreach($featureCollection->features as $feature){
      $geojson = json_encode($feature);
      if(!$first){
        $queryInsert.= ',';
      }
      $queryInsert.= '('. $row['ID'].', '. $row['EigenaarID'].",'".$geojson."',".'"'.$type.'")';
      if($first){
      echo $queryInsert;
      $first=false;
      }
    }
  }
}

$result = $db->query($queryInsert);
