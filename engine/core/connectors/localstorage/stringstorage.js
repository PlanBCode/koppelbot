exports.StringStorage = StringStorage;
function StringStorage (getData, setData, parse, stringify) {
  this.get = (entityClassName, entityIdList, basePropertyName, settings, callback) => { // TODO subPropertyPath
    const key = settings.key || basePropertyName;
    const index = !!settings.index;

    const data = getData(settings);
    const content = {[entityClassName]: {}};
    const {error, message, parsedData} = parse(data);
    if (error) callback(error, message);

    if (entityIdList === '*') {
      for (const entityId in parsedData) {
        const propertyResponseContent = index ? entityId : parsedData[entityId][key];
        content[entityClassName][entityId] = {[basePropertyName]: propertyResponseContent};
      }
      return callback(200, content);
    } else {
      const entityIds = entityIdList.split(',');
      content[entityClassName].status = 207;
      content[entityClassName].content = {};
      for (const entityId of entityIds) {
        if (!content[entityClassName].content.hasOwnProperty(entityId)) {
          content[entityClassName].content[entityId] = {status: 207, content: {}};
        }
        if (parsedData.hasOwnProperty(entityId)) {
          const entityData = parsedData[entityId];

          if (entityData !== null && typeof entityData === 'object' && (entityData.hasOwnProperty(key) || index)) {
            const propertyResponseContent = index ? entityId : entityData[key];
            content[entityClassName].content[entityId].content[basePropertyName] = {content: propertyResponseContent, status: 200};
          } else {
            content[entityClassName].content[entityId].content[basePropertyName] = {content: 'Not found', status: 404};
          }
        } else {
          content[entityClassName].content[entityId].content[basePropertyName] = {content: 'Not found', status: 404};
        }
      }
      return callback(207, content);
    }
  };

  this.head = (entityClassName, entityIdList, basePropertyName, settings, callback) => {
    const data = getData(settings);
    const {error, message, parsedData} = parse(data);
    if (error) callback(error, message);

    const entityIds = entityIdList === '*'
      ? Object.keys(parsedData)
      : entityIdList.split(',');
    const content = {[entityClassName]: {status: 207, content: {}}};
    for (const entityId of entityIds) {
      content[entityClassName].content[entityId] = {status: parsedData.hasOwnProperty(entityId) ? 200 : 404, content: null};
    }
    return callback(207, content);
  };

  this.put = (entityClassName, entityIdList, basePropertyName, settings, callback, requestContent) => {
    const index = !!settings.index;
    const key = settings.key || basePropertyName;

    const data = getData(settings);

    const {error, message, parsedData} = parse(data);
    if (error) callback(error, message);

    const entityIds = entityIdList === '*'
      ? Object.keys(parsedData)
      : entityIdList.split(',');
    const content = {[entityClassName]: {status: 207, content: {}}};
    const entityClassRequestContent = requestContent[entityClassName];

    for (const entityId of entityIds) {
      if (index) {
        // TODO
      } else {
        if (!parsedData.hasOwnProperty(entityId)) parsedData[entityId] = {};
        parsedData[entityId][key] = entityClassRequestContent[entityId][basePropertyName];
      }
      if (!content[entityClassName].content.hasOwnProperty(entityId)) {
        content[entityClassName].content[entityId] = {status: 200, content: {}};// TODO maybe 207 for patch
      }
      content[entityClassName].content[entityId].content[basePropertyName] = null;
    }
    setData(settings, stringify(parsedData));
    console.log('put', content);
    return callback(207, content);
  };

  this.patch = (entityIdList, settings, callback) => {
    // TODO
  };

  this.delete = (entityIdList, settings, callback) => {
  // TODO
  };
}
