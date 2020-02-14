exports.view = function(item){
    const content = item.getContent();
    const fileContent = content.content;
    const DIV_flat = document.createElement('DIV');
    DIV_flat.classList.add('xyz-file-flat');
    DIV_flat.innerHTML = fileContent;
    return DIV_flat;
};