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

function Node(object, entityId, status_, content_, errors_) {
    const status = status_;
    const content = content_;
    const errors = errors_;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getErrors = () => errors;
    this.render = (action, options) => object.render(action, options, entityId);
}

exports.filter = filter;
exports.Node = Node;