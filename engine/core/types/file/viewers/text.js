const recodeString = require('../../string/string').recodeString;

exports.view = function (item) {
    const content = item.getContent();
    const fileContent = content.content;
    const stringContent = recodeString(fileContent, 'utf8');
    const DIV_flat = document.createElement('DIV');
    DIV_flat.classList.add('xyz-file-flat');
    DIV_flat.innerHTML = stringContent;
    return DIV_flat;
};