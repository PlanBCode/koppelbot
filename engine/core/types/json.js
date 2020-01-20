exports.actions = {
    edit: function (item) {
        const TEXTAREA = document.createElement('TEXTAREA');
        TEXTAREA.value = item.getContent();
        TEXTAREA.oninput = () => {
            let content;
            try {
                content = JSON.parse(TEXTAREA.value);
            } catch (e) {
                //TODO
                return;
            }
            item.patch(content);
        };
        item.onChange(item => {
            if (TEXTAREA !== document.activeElement) {
                TEXTAREA.value = item.getContent();
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
        try {
            JSON.parse(item.getContent());
            return true;
        } catch (e) {
            return false;
        }
    },
    validateSubPropertyPath: function (subPropertyPath, settings) {
        return subPropertyPath instanceof Array;
    }
};