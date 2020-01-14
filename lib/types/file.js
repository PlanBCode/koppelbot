exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        const prepareContent = (files) => {
            //TODO add filetype validation (using accept to catch client side injections)
            const data = {};
            if (settings.multiple) {
                //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
            } else if (files.length === 0) {
                //TODO
            } else {
                const reader = new FileReader();
                reader.onload = evt => {
                    data['content'] = evt.target.result;
                    const extension = settings.signature['id'].storage.extension;
                    let key;
                    //TODO or extension is mixed extensions for example "json|xml"
                    if (extension && extension !== '*') {
                        key = files[0].name.split('.').splice('.').slice(0, -1).join('.');
                    } else {
                        key = files[0].name;
                    }
                    data['id'] = key;
                    onChange(data);
                };
                reader.onerror = evt => {
                    //TODO
                };
                reader.readAsText(files[0], "UTF-8");
            }
        };

        // TODO add id from options (for label for)
        const INPUT = document.createElement('INPUT');
        INPUT.type = 'file';
        if (content) {
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