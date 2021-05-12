<?php
ini_set('memory_limit', '256M');

$fileName = 'UITVOER_146109077.xlsx'; // Gem Amersfoort
//$fileName = 'UITVOER_455305162_Amersfoort.xlsx'; // Portaal

// $fileName = 'UITVOER_172013404_Amersfoort.xlsx'; // Aliantie

require('simpleXlsx.php');
$db = new SQLite3('site/data/mapdata.sqlite');

function lonLatToWebMercator($x_lon, $y_lat){
   if (abs($x_lon) <= 180 and abs($y_lat) < 90){
     $num = $x_lon * 0.017453292519943295;
     $x = 6378137.0 * $num;
     $a = $y_lat * 0.017453292519943295;
     $x_mercator = $x;
     $y_mercator = 3189068.5 * log((1.0 + sin($a)) / (1.0 - sin($a)));
    return [$x_mercator, $y_mercator];
  } else echo('[!] Invalid coordinate values for conversion');
}

function createBRKRequestUrl($data ){
  return 'https://geodata.nationaalgeoregister.nl/kadastralekaart/wfs/v4_0?service=WFS&version=2.0.0&request=GetFeature&typename=kadastralekaartv4:perceel&outputFormat=application/json&srsname=EPSG:3857&filter='
	. '<Filter><And>'
	. '<Or>'
	. '<PropertyIsEqualTo><PropertyName>kadastraleGemeenteWaarde</PropertyName><Literal>' . $data['kadastrale_gemeenteCode'] . '</Literal></PropertyIsEqualTo>'
	. '<PropertyIsEqualTo><PropertyName>AKRKadastraleGemeenteCodeWaarde</PropertyName><Literal>' . $data['kadastrale_gemeenteCode'] . '</Literal></PropertyIsEqualTo>'
	. '</Or>'
	. '<PropertyIsEqualTo><PropertyName>sectie</PropertyName><Literal>' . $data['sectie']  . '</Literal></PropertyIsEqualTo>'
	. '<PropertyIsEqualTo><PropertyName>perceelnummer</PropertyName><Literal>' . intval($data['perceelNummer']) . '</Literal></PropertyIsEqualTo>'
	. '</And></Filter>';
  /*
  {
  "type": "FeatureCollection",
  "numberMatched": 1,
  "name": "perceel",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } },
  "features": [
  { "type": "Feature", "id": "e8b1eaf6-9bfd-43f3-992c-c77700e80d17", "properties": { "identificatieNamespace": "NL.IMKAD.KadastraalObject", "identificatieLokaalID": "25430435970000", "beginGeldigheid": "2003-06-06T15:17:55.000", "tijdstipRegistratie": "2003-06-06T15:17:55.000", "volgnummer": 0, "statusHistorieCode": "G", "statusHistorieWaarde": "Geldig", "kadastraleGemeenteCode": "37", "kadastraleGemeenteWaarde": "Amersfoort", "sectie": "A", "AKRKadastraleGemeenteCodeCode": "37", "AKRKadastraleGemeenteCodeWaarde": "AMF00", "kadastraleGrootteWaarde": 658.0, "soortGrootteCode": "1", "soortGrootteWaarde": "Vastgesteld", "perceelnummer": 4359, "perceelnummerRotatie": 0.0, "perceelnummerVerschuivingDeltaX": 0.0, "perceelnummerVerschuivingDeltaY": 0.0, "perceelnummerPlaatscoordinaatX": 156270.498, "perceelnummerPlaatscoordinaatY": 464148.289 }, "geometry": { "type": "Polygon", "coordinates": [ [ [ 601753.765368782, 6830057.037801689 ], [ 601772.77872323, 6830088.006998383 ], [ 601793.035902291, 6830121.344401303 ], [ 601774.015539761, 6830133.131314192 ], [ 601734.468548157, 6830068.997502097 ], [ 601753.765368782, 6830057.037801689 ] ] ] } }
  ]
  }


   */
}

function createBAGSuggestRequestUrl($data){
  $huisAanduiding = intval($data['huisNummer']);
  if($data['huisNummerToevoeging'] !== '')  $huisAanduiding .= '-'.$data['huisNummerToevoeging'];
  if($data['huisLetter'] !== '')  $huisAanduiding .= '-'.$data['huisLetter'];

  return 'https://geodata.nationaalgeoregister.nl/locatieserver/v3/suggest?q='
  .$data['straat'].'%20'
  .$huisAanduiding.'%20'
  .$aanduiding[2].',%20'
  .$data['postcode'].'%20'
  .$data['plaats'].'&fq=bron:BAG';
  /*
  {
    "response":{"numFound":1,"start":0,"maxScore":18.249285,"docs":[
        {
          "type":"adres",
          "weergavenaam":"Lijsterstraat 20, 3815DT Amersfoort",
          "id":"adr-fb6a9e8075bd7e25281db1d21fb17982",
          "score":18.249285}]
    },
    "highlighting":{
      "adr-fb6a9e8075bd7e25281db1d21fb17982":{
        "suggest":["Lijsterstraat 20, <b>3815DT</b> <b>Amersfoort</b>"]}},
    "spellcheck":{  ...

  */
}

function createBAGLookUpUrl($id){
  return 'https://geodata.nationaalgeoregister.nl/locatieserver/v3/lookup?id='.$id;
  /*
  {
    "response":{"numFound":1,"start":0,"maxScore":15.743678,"docs":[
        {
          "bron":"BAG",
          "woonplaatscode":"1664",
          "type":"adres",
          "woonplaatsnaam":"Amersfoort",
          "wijkcode":"WK030710",
          "huis_nlt":"20",
          "openbareruimtetype":"Weg",
          "buurtnaam":"Vinkenbaan",
          "gemeentecode":"0307",
          "rdf_seealso":"http://bag.basisregistraties.overheid.nl/bag/id/nummeraanduiding/0307200000463989",
          "weergavenaam":"Lijsterstraat 20, 3815DT Amersfoort",
          "straatnaam_verkort":"Lijsterstr",
          "id":"adr-fb6a9e8075bd7e25281db1d21fb17982",
          "gekoppeld_perceel":["AMF00-A-6864"],
          "gemeentenaam":"Amersfoort",
          "buurtcode":"BU03071001",
          "wijknaam":"Wijk 10 Liendert",
          "identificatie":"0307010000463990-0307200000463989",
          "openbareruimte_id":"0307300000306981",
          "waterschapsnaam":"Vallei & Veluwe",
          "provinciecode":"PV26",
          "postcode":"3815DT",
          "provincienaam":"Utrecht",
          "centroide_ll":"POINT(5.40168265 52.16646193)",
          "nummeraanduiding_id":"0307200000463989",
          "waterschapscode":"08",
          "adresseerbaarobject_id":"0307010000463990",
          "huisnummer":20,
          "provincieafkorting":"UT",
          "centroide_rd":"POINT(155990.61 464256.19)",
          "straatnaam":"Lijsterstraat",
          "gekoppeld_appartement":["AMF00-A-6892-A-1"]}]
    }}
   */
}

function handleRow($db, $data, $documentID, $eigenaarID){
  $queryInsertHead = 'INSERT INTO Locaties (DocumentID, EigenaarID, geojson, `type`) VALUES ';

  $brkUrl = createBRKRequestUrl($data);
  $brkResponseString = file_get_contents($brkUrl);

  if($brkResponseString){
    $queryInsert = $queryInsertHead;
    $brkResponse = json_decode($brkResponseString, true);
    if(count($brkResponse['features'])===0){

      echo "[!] Empty BRK encountered, trying BAG.\n";

      $bagSuggestUrl = createBAGSuggestRequestUrl($data);
      $bagSuggestResponseString = file_get_contents($bagSuggestUrl);

      $bagSuggestResponse = json_decode($bagSuggestResponseString, true);
      $numResults = count($bagSuggestResponse['response']['docs']);
      if($numResults >0){
        if($numResults > 1) echo "[!] Warning: Multiple BAG results for ".$data['kadastrale_gemeenteCode'].'.'.$data['perceelNummer'].'.'.$data['sectie'].".\n";
        $id = $bagSuggestResponse['response']['docs'][0]['id'];
        $bagLookupUrl = createBAGLookUpUrl($id);
        $bagLookupResultString = file_get_contents($bagLookupUrl);
        $bagLookupResult = json_decode($bagLookupResultString, true);
        // "centroide_ll":"POINT(5.40168265 52.16646193)",
        $doc = $bagLookupResult['response']['docs'][0];
        $lonLat = explode(' ',substr($doc['centroide_ll'],6,-1)); // 'POINT(5.40168265 52.16646193)' -> '5.40168265 52.16646193' -> ['5.40168265','52.16646193']
        $coordinates = lonLatToWebMercator((double) $lonLat[0], (double) $lonLat[1]);
        $feature = [
          "type" => "Feature",
          "geometry" => [
            "type" => "Point",
            "coordinates" => $coordinates
          ],
          "properties" => [
            'xlsx' => $data,
            "BAG" => $doc
          ]
        ];
        $geoJsonString = json_encode($feature);
        $queryInsert.= '('. $documentID.','. $eigenaarID.",'".$db->escapeString($geoJsonString)."',".'"BRK")';
      }else {
        echo "[!] Error: No BAG results for ".$data['kadastrale_gemeenteCode'].'.'.$data['perceelNummer'].'.'.$data['sectie'].".\n";
        return;
      }

    }else{

      foreach($brkResponse['features'] as $index => $feature){ // FeatureCollection -> Features
        $feature['properties']['xlsx'] = $data;
        $geoJsonString = json_encode($feature);
        if($index > 0 ) $queryInsert.= ',';
        $queryInsert.= '('. $documentID.','. $eigenaarID.",'".$db->escapeString($geoJsonString)."',".'"BRK")';
      }
    }
    $result = $db->query($queryInsert);
    if($result === false) {
      echo '[!] insert failed: query '.$queryInsert."\n";
      echo '[!] insert failed: geoJsonString '.$geoJsonString."\n";
    }
  }else{
    echo "[!] Warning: failed to retrieve BRK data for ".$data['kadastrale_gemeenteCode'].'.'.$data['perceelNummer'].'.'.$data['sectie'].".\n";
  }
}

function getRowData($row){
  return [
    "naam" => $row[0],
    "subjectNr" => $row[1],
    "objectNr" => $row[2],
    "kad_naam" => $row[3],
    "sectie" => $row[4],
    "kadastrale_gemeenteCode" => $row[5],
    "perceelNummer" => $row[6],
    "objectIndexLetter" => $row[7],
    "objectIndexNummer" => $row[8],
    "plaats" => $row[9],
    "straatNaam" => $row[10],
    "aanduiding_bij_huisNummer" => $row[11],
    "huisNummer" => $row[12],
    "huisLetter" => $row[13],
    "huisNummerToevoeging" => $row[14],
    "postcode" => $row[15],
    "pht" => $row[16]
  ];
}

echo "[.] Parsing xlsx...\n";
if ( $xlsx = SimpleXLSX::parse($fileName) ) {
  echo "[i] Parsing xlsx succeeded.\n";
  $rows = $xlsx->rows();
  $i = 0;
  $first = true;
  foreach ($rows as $row) {
    if($i > 0){ // skip header row
      $data = getRowData($row);
      if($first){
        echo "[i] Find eigenaarID '".$data['naam']."'\n";
        $queryEigenaar = 'SELECT ID FROM Eigenaren WHERE UPPER(Naam) = UPPER("'.$db->escapeString($data['naam']).'")';
        $result = $db->query($queryEigenaar);
        $eigenaar = $result->fetchArray();
        if(!$eigenaar){
          $result = $db->query('INSERT INTO `Eigenaren` (Naam) VALUES ("'.$db->escapeString($data['naam']).'")');
          if($result === false) echo '[!] insert failed: '.$queryInsert."\n";
          $eigenaarID = $db->lastInsertRowID();
          echo "[i] eigenaarID '".$data['naam']." not found, created it.'\n";
        }else{
          $eigenaarID=$eigenaar[0];
        }
        echo "[i] Found eigenaarID ".$eigenaarID ."\n";
        echo "[i] Clear existing locations.\n";

        $queryDeleteLocaties = 'DELETE FROM Locaties WHERE EigenaarID='.$eigenaarID;
        $result = $db->query($queryDeleteLocaties);
        echo "[i] Clear duplicate documents.\n";
        $queryDeleteDocument = 'DELETE FROM Documenten WHERE Bestand="'.$db->escapeString($fileName).'"';
        $result = $db->query($queryDeleteDocument);

        $queryInsertDocument = 'INSERT INTO Documenten (Type,Bron,Datum,Bestand,EigenaarID) VALUES ("BRK|BAG","Kadaster","22-01-2021","'.$db->escapeString($fileName).'",'.$eigenaarID.')';
        $result = $db->query($queryInsertDocument);
        $documentID = $db->lastInsertRowID();
        echo "[i] Created document ".$documentID ."\n";
        $first = false;
      }
      echo "[.] ".($i)."/".(count($rows)-1)."\n";//$url;

      handleRow($db, $data, $documentID, $eigenaarID);
      usleep(100000); // Wait 0.1 seconds
    }
    ++$i;
  }
}else echo "[!] Parsing xlsx failed.\n";
