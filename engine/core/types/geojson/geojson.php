<?php

require ('./engine/core/types/json/json.php');


function mergeBoundingBoxes(array &$a,array &$b)
{
    $a[0]  = min($a[0],$b[0]);
    $a[1]  = min($a[1],$b[1]);
    $a[2]  = max($a[2],$b[2]);
    $a[3]  = max($a[3],$b[3]);
}


function getBoundingBox(array &$geojson) : array
{
  if (array_key_exists('bbox', $geojson)) return $geojson['bbox'];
  else{
    $type = $geojson["type"];
    switch($geojson["type"]){
      case 'Feature':
        if (!array_key_exists('geometry', $geojson)) return [];
        return getBoundingBox($geojson['geometry']);
      case 'Point':
        if (!array_key_exists('coordinates', $geojson)) return [];
        return array_merge($geojson['coordinates'],$geojson['coordinates']); // [x,y,x,y]
      case 'MultiPoint':
      case 'LineString':
      case 'MultiLineString':
      case 'Polygon':
        if (!array_key_exists('coordinates', $geojson)) return [];
        $count = count($geojson['coordinates']);
        if($count === 0) return [];
        $bbox = array_merge($geojson['coordinates'][0],$geojson['coordinates'][0]); // [x0,y0,x0,y0]
        for($i=1; $i<$count; ++$i){
          $bboxi = array_merge($geojson['coordinates'][$i],$geojson['coordinates'][$i]); // [xi,yi,xi,yi]
          mergeBoundingBoxes($bbox, $bboxi);
        }
      case 'GeometryCollection':
        if (!array_key_exists('geometries', $geojson)) return [];
        $count = count($geojson['geometries']);
        if($count === 0) return [];
        $bbox = getBoundingBox($geojson['geometries'][0]);
        for($i=1; $i<$count; ++$i){
          $bboxi = getBoundingBox($geojson['geometries'][$i]);
          mergeBoundingBoxes($bbox, $bboxi);
        }
        return $bbox;
      case 'FeatureCollection':
        if (!array_key_exists('features', $geojson)) return [];
        $count = count($geojson['features']);
        if($count === 0) return [];
        $bbox = getBoundingBox($geojson['features'][0]);
        for($i=1; $i<$count; ++$i){
          $bboxi = getBoundingBox($geojson['features'][$i]);
          mergeBoundingBoxes($bbox, $bboxi);
        }
        return $bbox;
      default:
        return [];
    }
  }
}

class Type_geojson extends Type_json
{
  // lhs>=<rhs whether feature overlaps with bounding box;
  static public function operatorOVERLAP(&$lhs, &$rhs): bool
  {
      $bbox = explode(',',$rhs);
      if(count($bbox) !== 4) return false;
      $lhsBbox = getBoundingBox($lhs);
      if(count($lhsBbox) !== 4) return false;

      return $lhsBbox[0] <= $bbox[2]
        && $lhsBbox[1] <= $bbox[3]
        && $lhsBbox[2] >= $bbox[0]
        && $lhsBbox[3] >= $bbox[1];
  }
  // lhs<>rhs whether feature is fully contained in bounding box;
  static public function operatorIN(&$lhs, &$rhs): bool
  {
      $bbox = explode(',',$rhs);
      if(count($bbox) !== 4) return false;
      $lhsBbox = getBoundingBox($lhs);
      if(count($lhsBbox) !== 4) return false;

      return $lhsBbox[0] >= $bbox[0]
        && $lhsBbox[1] >= $bbox[1]
        && $lhsBbox[2] <= $bbox[2]
        && $lhsBbox[3] <= $bbox[3];
  }
  // lhs<>rhs whether feature fully contains bounding box;
  static public function operatorOUT(&$lhs, &$rhs): bool
  {
      $bbox = explode(',',$rhs);
      if(count($bbox) !== 4) return false;
      $lhsBbox = getBoundingBox($lhs);
      if(count($lhsBbox) !== 4) return false;

      return $lhsBbox[0] <= $bbox[0]
        && $lhsBbox[1] <= $bbox[1]
        && $lhsBbox[2] >= $bbox[2]
        && $lhsBbox[3] >= $bbox[3];
  }
  //TODO extra validation for geojson
}
