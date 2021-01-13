//reference: https://geojson.org/geojson-spec.html
const json = require('../json/json.js');

const xmlns = "http://www.w3.org/2000/svg";

function isValidCoordinate(coordinate){
  return isValidArrayOfSubType(coordinate, x => typeof x === 'number') && coordinate.length >= 2;
}

function isValidArrayOfSubType(array, isValidSubFunction){
  if(!(array instanceof Array)) return false;
  for(let member of array){
    if(!isValidSubFunction(member)) return false;
  }
  return true;
}

const isValidMultiPoint = minimumPoints => array => isValidArrayOfSubType(array,isValidCoordinate) && array.length >= minimumPoints;

const isValidPolygon = array => isValidArrayOfSubType(array, isValidMultiPoint(3));

function isValidGeometry(content){
  if(typeof content !== 'object' || content === null) return false;
  if(!content.hasOwnProperty('type')) return false;
  //TODO bbox
  //TODO crs
  switch(type){
    case 'Point':
      return isValidCoordinate(content.coordinates);
    case 'MultiPoint':
      return isValidMultiPoint(content.coordinates);
    case 'LineString':
      return isValidMultiPoint(2)(content.coordinates)
    case 'MultiLineString':
      return isValidArrayOfSubType(content.coordinates, isValidMultiPoint(0));
    case 'Polygon':
      // todo check that first contains next (first is surface, next are the holes in the surface)
      return isValidPolygon(content.coordinates);
    case 'MultiPolygon':
      return isValidArrayOfSubType(content.coordinates, isValidPolygon);
    case 'GeometryCollection':
      return isValidArrayOfSubType(content.geometries, isValidGeometry);
    default:
      return false;
  }
}

function isValidFeature(content){
  if(typeof content !== 'object' || content === null) return false;
  if(!content.hasOwnProperty('type')) return false;
  //TODO bbox
  //TODO crs
  switch(type){
  case 'FeatureCollection':
    return isValidArrayOfSubType(content.geometries, isValidFeature);
  case 'Feature':
    return content.geometry === null || isValidGeometry(content.geometry);
  default:
    return false;
  }
}

exports.actions = {
    edit: item => {
      if(item.getOptions('svg')){
        // TODO create svg object and return
      } else return json.actions.edit(item);
    },
    view: item => {
      if(item.getOption('svg')){
        const SVG = document.createElementNS(xmlns,'circle');

        const onChangeHandler = item => {
          const content = item.getContent();
          //TODO check
          switch(content.type){
            case 'Point' :
            SVG.setAttributeNS(null,'cx', content.coordinates[0]);
            SVG.setAttributeNS(null,'cy', content.coordinates[1]);
            SVG.setAttributeNS(null,'r', '10');
            SVG.setAttributeNS(null,'fill', 'red');
            SVG.setAttributeNS(null,'stroke', 'black');
            SVG;
            //TODO other cases
          }
        }
        onChangeHandler(item);
        item.onChange(onChangeHandler);
        return SVG;
        /*const PATH = document.createElementNS(xmlns,'path');
        PATH.setAttributeNS(null,'d', 'M10 10 L20 20 L30 30');
        PATH.setAttributeNS(null,'stroke', 'red');
        return PATH;*/
      } else return json.actions.view(item);
    },
    validateContent: function (item) {
      if(!json.actions.validateContent(item)) return false; // check if valid json
      const content = item.getContent();
      return isValidGeometry(content) || isValidFeature(content)
    }
};
