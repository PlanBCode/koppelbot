<?
//Add bbox (bounding box) to geosjon in Locaties

class Type{}
require('../../../engine/core/types/geojson/geojson.php');
$db = new SQLite3('../../../data/mapdata.sqlite');
$page=0;
$pageSize = 1000;
$emptyResult = false;
while(!$emptyResult){
  $offset=$page*$pageSize;
  $query = "SELECT ID,geojson FROM Locaties LIMIT $pageSize OFFSET $offset";
  $result = $db->query($query);
  $emptyResult = true;
  echo "[page $page\n";
  while($row = $result->fetchArray()){
    $id= $row['ID'];
    $emptyResult = false;
    $geojson = json_decode($row['geojson'], true);
    if(!array_key_exists('bbox',$geojson)){
      $bbox = getBoundingBox($geojson);
      $patchQuery = "UPDATE Locaties SET geojson = json_patch(geojson,'".json_encode(["bbox"=>$bbox])."') WHERE ID=$id";
      $db->query($patchQuery);
    }
  }
  ++$page;

}
