<?
//Add bbox (bounding box) to geosjon in Locaties


$db = new SQLite3( dirname(__FILE__) .'/../../../data/mapdata.sqlite');

$query = "
ALTER TABLE Eigenaren ADD `Oppervlakte` real NOT NULL DEFAULT '0';
ALTER TABLE Eigenaren ADD `Aantal` integer NOT NULL DEFAULT '0';
";
$db->query($query);


$query = "SELECT EigenaarID AS ID, count(*) AS Aantal, sum(json_extract(geojson, '\$.properties.kadastraleGrootteWaarde')) AS Oppervlakte FROM Locaties GROUP BY EigenaarID";
$result = $db->query($query);
while($row = $result->fetchArray()){
  $oppervlakte = $row['Oppervlakte'] ?  $row['Oppervlakte'] : 0;
  $aantal = $row['Aantal'];
  $query = "UPDATE Eigenaren SET Aantal = $aantal, Oppervlakte = $oppervlakte WHERE ID=".$row['ID'];
  $db->query($query);

  echo $query."\n";
}
