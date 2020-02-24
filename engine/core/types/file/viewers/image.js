function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

exports.view = function (item) {
    const content = item.getContent();
    const fileContent = content.content;
    const IMG = document.createElement('IMG');
    IMG.classList.add('xyz-file-image');
    //TODO check encoding
    const base64String = fileContent.content;
    //TODO get mime
    IMG.src = 'data:image/jpeg;base64,' + base64String;
    return IMG;
};