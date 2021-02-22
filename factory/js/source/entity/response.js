const Property = require('./property').constructor;

function extractContentFromNode (contentOrNode) {
  if (contentOrNode instanceof Node) {
    return [
      contentOrNode.getObject(),
      contentOrNode.getEntityId(),
      contentOrNode.getStatus(),
      contentOrNode.getContent(),
      contentOrNode.getErrors(),
      contentOrNode.getMethod()
    ];
  } else {
    let entityId, method;
    const errors = [];
    let status = 200;
    const content = {};
    let subObject, subStatus, subContent, subErrors;
    for (const propertyName in contentOrNode) {
      [subObject, entityId, subStatus, subContent, subErrors, method] = extractContentFromNode(contentOrNode[propertyName]);
      if (typeof status === 'undefined') {
        status = subStatus;
      } else if (status !== subStatus) {
        status = 207;
      }
      errors.push.apply(errors, subErrors);
      content[propertyName] = subContent;
    }
    const object = subObject.getParent();
    return [object, entityId, status, content, errors, method];
  }
}

function mergeIntoSingleNode (contentOrNode) {
  if (contentOrNode instanceof Node) {
    return contentOrNode;
  } else {
    const [object, entityId, status, content, subErrors, method] = extractContentFromNode(contentOrNode);
    return new Node(object, entityId, status, content, subErrors, method);
  }
}

function filter (content, path) {
  if (path.length === 0) {
    return mergeIntoSingleNode(content);
  } else {
    const subPath = path.slice(1);
    const propertyNameList = path[0];
    const filteredContent = {};
    if (propertyNameList === '*') {
      for (const propertyName in content) {
        filteredContent[propertyName] = filter(content[propertyName], subPath);
      }
    } else {
      const propertyNames = propertyNameList.split(',');
      for (const propertyName in content) {
        if (propertyNames.includes(propertyName)) {
          filteredContent[propertyName] = filter(content[propertyName], subPath);
        }
      }
    }
    return filteredContent;
  }
}

function getSubNodeFromNode (subPath, object, entityId, status, content, errors, method) {
  if (subPath.length === 0) { // TODO or has errors?
    return new Node(object, entityId, status, content, errors, method);
  } else if (content !== null && typeof content === 'object' && content.hasOwnProperty(subPath[0])) {
    const subObject = object.getSubObject(subPath[0]);
    if (subObject) {
      return getSubNodeFromNode(subPath.slice(1), subObject, entityId, status, content[subPath[0]], errors, method);
    } else {
      return new Node(object, entityId, 404, null, ['Not found'], method);
    }
  } else {
    return null; // unmodified
  }
}

function Node (object, entityId, status_, content_, errors_, method_) {
  const status = status_;
  const content = content_;
  const errors = errors_;
  const method = method_;
  this.getUri = () => object ? object.getUri(entityId) : undefined;

  this.getObject = () => object; // TODO need private
  this.getEntityId = () => entityId;
  this.getMethod = () => method;
  this.getStatus = () => status;
  this.getContent = () => content;
  this.hasErrors = () => !((status >= 200 && status <= 299) || status === 304) || (errors instanceof Array && errors.length > 0);
  this.getErrors = () => errors;
  this.hasSetting = settingName => {
    if (object instanceof Property) return object.hasSetting(settingName);
    else return false;
  };
  this.getSetting = settingName => {
    if (object instanceof Property) return object.getSetting(settingName);
    else return undefined;
  };
  this.getSettings = () => {
    if (object instanceof Property) return object.getSettings();
    else return {};
  };

  this.render = (action, options, subPath) => {
    let subOptions = options;
    if (typeof options === 'object' && options !== null &&
            subPath instanceof Array && subPath.length > 0 &&
            options.hasOwnProperty('subOptions') &&
            options.subOptions.hasOwnProperty(subPath[0])) {
      subOptions = options.subOptions[subPath[0]];
    }
    return object.render(action, subOptions, entityId, subPath);
  };
  this.getSubNode = subPath => getSubNodeFromNode(subPath, object, entityId, status, content, errors);
  /*
  this.select = (entityClassName, entityId)
  this.renderCreator = (options, uri, settings, subPropertyPath, newCreatorData, INPUT_submit, displayMessage) => render.creator(xyz, options, uri, settings, subPropertyPath, newCreatorData, INPUT_submit, displayMessage);
  this.onChange = callback => {
    this.validateContent = (content_, settings_) => {
  this.ui = xyz.ui;
  this.patch = (newContent, additionalSubPropertyPath) => {
    this.delete = subPropertyPath => {
      this.renderSubElement = (action, additionalSubPropertyPath, status, content, settings, options_) => {
      this.getOption
      this.hasOption
      this.getOptions

   */
}

function getSubNode (node, subPath) {
  if (subPath.length === 0) { // TODO or has errors?
    return node;
  } else if (node instanceof Node) {
    return node.getSubNode(subPath);
  } else if (node !== null && typeof node === 'object' && node.hasOwnProperty(subPath[0])) {
    return getSubNode(node[subPath[0]], subPath.slice(1));
  } else {
    return null; // unmodified
  }
}

exports.Node = Node;
exports.filter = filter;
exports.getSubNode = getSubNode;
