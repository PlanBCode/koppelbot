exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        const prepareContent = (files) => {
            //TODO add filetype validation (using accept to catch client side injections)
            //TOD check signature is object
            let keyPropertyName, contentPropertyName;
            for (let propertyName in settings.signature) {
                if (settings.hasOwnProperty('signature') && typeof settings.signature === 'object' && settings.signature !== null) {
                    //TODO check if settings.signature[propertyName].storage is object
                    if (settings.signature[propertyName].storage.key) {
                        keyPropertyName = propertyName;
                    }
                    if (settings.signature[propertyName].storage.content) {
                        contentPropertyName = propertyName;
                    }
                }
            }

            if (keyPropertyName && contentPropertyName) {
                //const [_, entityClass, entityId, propertyName] = uri.split('/');
                const data = {};
                if (settings.multiple) {
                    //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
                } else if (files.length === 0) {
                    //TODO
                } else {
                    const reader = new FileReader();
                    reader.onload = evt => {
                        data[contentPropertyName] = evt.target.result;
                        const extension = settings.signature[keyPropertyName].storage.extension;
                        let key;
                        //TODO or extension is mixed extensions for example "json|xml"
                        if (extension && extension !== '*') {
                            key = files[0].name.split('.').splice('.').slice(0, -1).join('.');
                        } else {
                            key = files[0].name;
                        }
                        data[keyPropertyName] = key;
                        onChange(data);
                    };
                    reader.onerror = evt => {
                        //TODO
                    };
                    reader.readAsText(files[0], "UTF-8");
                }
            }else{
                //TODO error
            }
        };

        // TODO add id from options (for label for)
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'file';
        if (content) {
            console.log('file',content);
            INPUT.value = content;
        }
        if (onChange) {
            INPUT.addEventListener('change', event => {
                prepareContent(event.target.files, onChange);
            });
        }
        if (settings.multiple) {
            INPUT.multiple = true;
        }
        if (settings.accept) {
            INPUT.accept = settings.accept;
        }
        return INPUT;
    },
    /*view: function (xyz, uri, status, content, settings, options) {
        //TODO use a file viewer:   https://viewerjs.org/
        return content;
    },*/
    validate: function (xyz, uri, status, content, settings, options) {
        //TODO implement client side validation
        //todo mime/accept
        //todo max size
        return true;
    }
};