xyz.types.file = {

    edit: function (uri, content, settings, options, onChange) {
        const prepareContent = ( files) => {
            //TODO add filetype validation (using accept to catch client side injections)
            //TODO check multiple from settings

            if (settings.hasOwnProperty('key')) {
                const key = settings.key;
                const [_, entityClass, entityId, propertyName] = uri.split('/');
                const data = {};
                if (settings.multiple) {
                    //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
                } else if (files.length === 0) {
                    //TODO
                } else {
                    const reader = new FileReader();
                    reader.onload = evt => {
                        data[propertyName] = evt.target.result;
                        data[key] = files[0].name;
                        onChange(data);
                    };
                    reader.onerror = evt => {
                        //TODO
                    };
                    reader.readAsText(files[0], "UTF-8");

                }
            }/* else {
            let content;
            if (settings.multiple) {
                //TODO content = '[' + files.map(file => file.text()).join(',') + ']';
            } else if(files.length===0) {
                //TODO
            }else{
                content = files[0].text();
            }
            xyz.put(uri, content);*/
            // }
        };

        // TODO add id from options (for label for)
        const INPUT = document.createElement('INPUT');
        INPUT.type='file';
        if(content){
            INPUT.value = content;
        }
        if(onChange){
            this.onChange = event => {
                prepareContent(event.target.files);
            };
        }
        if (settings.multiple) {
            INPUT.multiple=true;
        }
        if (settings.accept) {
            INPUT.accept = settings.accept;
        }
        return INPUT;
    },
    /*view: function (uri, content, settings, options) {
        //TODO use a file viewer:   https://viewerjs.org/
        return content;
    },*/
    validate: function (uri, content, settings, options) {
        //TODO implement client side validation
        //todo mime/accept
        //todo max size
        return true;
    }
}
;