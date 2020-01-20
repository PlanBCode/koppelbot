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
                const reader = new FileReader();
                reader.onload = evt => {
                    data['content'] = evt.target.result;
                    const extension = item.getSetting('signature').id.storage.extension;
                    let key;
                    //TODO or extension is mixed extensions for example "json|xml"
                    if (extension && extension !== '*') {
                        key = files[0].name.split('.').splice('.').slice(0, -1).join('.');
                    } else {
                        key = files[0].name;
                    }
                    data['id'] = key;
                    item.patch(data);
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
        const content = item.getContent();
        if (content) {
            INPUT.value = content;
        }
        if (item.patch) {
            INPUT.addEventListener('change', event => {
                prepareContent(event.target.files, item.patch);
            });
        }
        INPUT.multiple = item.getSetting('multiple');
        INPUT.accept = item.getSetting('accept');

        return INPUT;
    },
    /*view: function (item) {
        //TODO use a file viewer:   https://viewerjs.org/
        //TODO onChange
        return content;
    },*/
    validateContent: function (item) {
        //TODO implement client side validation
        //todo mime/accept
        //todo max size
        return true;
    }
};