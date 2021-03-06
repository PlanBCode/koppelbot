const viewers = {
    txt: require('./viewers/text'),
    jpg: require('./viewers/image'),
    jpeg: require('./viewers/image'),
    png: require('./viewers/image'),
    bmp: require('./viewers/image'),
    gif: require('./viewers/image'),
    pdf: require('./viewers/pdf'),

};

const encodeContent = (data, item, file) => evt => {
  const mimeTypeAndBase64String = evt.target.result;
  const [mimeType, base64String] = mimeTypeAndBase64String
    .substr(5) // 'data:${mimeType};base64,${base64String}' -> '${mimeType};base64,${base64String}'
    .split(';base64,'); // '${mimeType};base64,${base64String}' -> ['${mimeType}','${base64String}']

  if(item.hasSetting('signature','content')){
    if (item.getSetting('signature','content','binary') === true) {
      data['content'] = {
          encoding: 'base64',
          content: base64String
      };
    } else {
      data['content'] = atob(base64String);
    }
  }
  if(item.hasSetting('signature','size')) data['size'] = file.size;
  if(item.hasSetting('signature','lastModified')) data['lastModified'] =  file.lastModified;
  if(item.hasSetting('signature','mime')) data['mime'] = mimeType;

  const lastIndex = file.name.lastIndexOf('.');
  if (lastIndex === -1){
   if(item.hasSetting('signature','basename')) data['basename'] = file.name;
   if(item.hasSetting('signature','extension')) data['extension'] = '';
  } else {
   if(item.hasSetting('signature','basename')) data['basename'] = file.name.substr(0,lastIndex);
   if(item.hasSetting('signature','extension')) data['extension'] = file.name.substr(lastIndex + 1);
  }
  if(item.hasSetting('signature','id')){
    const extension = item.getSetting('signature','id','connector','extension');
    let key;
    //TODO or extension is mixed extensions for example "json|xml"
    if (extension && extension !== '*') { // determine whether the extension is part of the key
      key = file.name.split('.').slice(0, -1).join('.');
    } else {
      key = file.name;
    }
    key = key.replace(/ /g, '_'); // remove spaces from filename
    data['id'] = key;
  }
  item.patch(data);
};

exports.actions = {
    edit: function (item) {
        const prepareContent = (files) => {
            //TODO add filetype validation (using accept to catch client side injections)
            const data = {};
            if (item.getSetting('multiple')) {
                //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
            } else if (files.length === 0) {
                //TODO
            } else {
                const fileName = files[0];
                const reader = new FileReader();
                reader.onload = encodeContent(data, item, fileName);
                reader.onerror = evt => {
                    console.error('Error reading file');
                };
                reader.readAsDataURL(fileName);
                const url = window.URL.createObjectURL(fileName);
            }
        };
        const DIV = document.createElement('DIV');
        const content = item.getContent();
        if (typeof content === 'object' && content !==null && (content.content || content.id)) {
          let fileName = '[file]';
          if(content.hasOwnProperty('id')) fileName = content.id;
          else if(content.hasOwnProperty('extension') && content.extension !== '*' && typeof content.extension === 'string') fileName = '[file].'+content.extension;

          const SPAN_value = document.createElement('SPAN'); // as we cannot set INPUT.value for security reasons we display current content here
          SPAN_value.innerHTML = fileName;
          DIV.appendChild(SPAN_value);
        }

        // TODO add id from options (for label for)
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'file';

        if (item.patch) {
            INPUT.addEventListener('change', event => {
                prepareContent(event.target.files, item.patch);
            });
        }
        INPUT.multiple = item.getSetting('multiple');
        if(item.hasSetting('accept')) INPUT.setAttribute('accept',item.getSetting('accept'));
        if(item.hasSetting('capture')) INPUT.setAttribute('capture',item.getSetting('capture'));
        DIV.appendChild(INPUT);
        return DIV;
    },
    view: function (item) {
        //TODO use a file viewer:   https://viewerjs.org/
        const DIV_container = document.createElement('DIV');
        DIV_container.classList.add('xyz-file-container');

        const onChangeHandler = node => {
            DIV_container.innerHTML = '';
            const content = item.getContent();
            if (typeof content === 'object' && content !== null && content.hasOwnProperty('content') && content.content !== null && typeof content.content !== 'undefined') {
              //TODO use mime
              const extension = content.hasOwnProperty('extension') && typeof content.extension === 'string'
               ? content.extension.toLowerCase()
               : null;
              const fallbackExtension = viewers.hasOwnProperty(extension) && typeof viewers[extension].view === 'function'
                  ? extension : 'txt';
              const DIV_fileContent = viewers[fallbackExtension].view(item);
              DIV_container.appendChild(DIV_fileContent);
            }
        };
        item.onChange(onChangeHandler);
        onChangeHandler(item);
        //TODO onChange
        return DIV_container;
    },
    validateContent: function (item) {
        //TODO implement client side validation
        //todo mime/accept
        //todo max size
        return true;
    }
};
