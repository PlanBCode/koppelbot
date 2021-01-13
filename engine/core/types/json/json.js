exports.actions = {
    edit: function (item) {
        const TEXTAREA = document.createElement('TEXTAREA');
        TEXTAREA.value = JSON.stringify(item.getContent());
        TEXTAREA.oninput = () => {
            let content;
            try {
                content = JSON.parse(TEXTAREA.value);
            } catch (e) {
                //TODO
                return;
            }
            console.log('edit',content)
            item.patch(content);
        };
        item.onChange(item => {
            if (TEXTAREA !== document.activeElement) {
                TEXTAREA.value = JSON.stringify(item.getContent());
            }
        });
        return TEXTAREA;
    },
    view: function (item) {
        const DIV = document.createElement('DIV');
        DIV.innerText = JSON.stringify(item.getContent());
        item.onChange(item => {
            DIV.innerText = JSON.stringify(item.getContent());
        });
        return DIV;
    },
    validateContent: function (item) {
        return true;
    },
    validateSubPropertyPath: function (subPropertyPath, settings) {
        return subPropertyPath instanceof Array;
    }
};
