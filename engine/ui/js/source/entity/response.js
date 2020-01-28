function filter(content, path) {
    if (path.length === 0) {
        return;
    }
    const subPath = path.slice(1);
    const propertyNameList = path[0];
    if (propertyNameList === '*') {
        for (let propertyName in content) {
            filter(content[propertyName], subPath);
        }
    } else {
        const propertyNames = propertyNameList.split(',');
        for (let propertyName in content) {
            if (propertyNames.indexOf(propertyName) === -1) {
                delete content[propertyName];
            } else {
                filter(content[propertyName], subPath);
            }
        }
    }
}

function getSubNodeFromNode(subPath, object, entityId, status, content, errors, method) {
    if (subPath.length === 0) { //TODO or has errors?
        return new Node(object, entityId, status, content, errors, method)
    } else if (content !== null && typeof content === 'object' && content.hasOwnProperty(subPath[0])) {
        return getSubNodeFromNode(subPath.slice(1), object, entityId, status, content[subPath[0]], errors, method);
    } else {
        return null; // unmodified
    }
}

function Node(object, entityId, status_, content_, errors_, method_) {

    const status = status_;
    const content = content_;
    const errors = errors_;
    const method = method_;
    /*
    TODO object can be empty  maybe need to fix that?
    this.hasSetting = settingName => object.getSettings().hasOwnProperty(settingName);
    this.getSetting = settingName => object.getSettings()[settingName];
    this.getSettings = () => object.getSettings();*/
    this.getMethod = () => method;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getErrors = () => errors;
    this.render = (action, options) => object.render(action, options, entityId);
    this.getSubNode = subPath => getSubNodeFromNode(subPath, object, entityId, status, content, errors);
}

function getSubNode(object, entityId, node, subPath) {
    if (subPath.length === 0) { //TODO or has errors?
        return node;
    } else if (node instanceof Node) {
        return node.getSubNode(subPath);
    } else if (node !== null && typeof node === 'object' && node.hasOwnProperty(subPath[0])) {
        return getSubNode(object, entityId, node[subPath[0]], subPath.slice(1));
    } else {
        return null; // unmodified
    }
}

exports.Node = Node;
exports.filter = filter;
exports.getSubNode = getSubNode;