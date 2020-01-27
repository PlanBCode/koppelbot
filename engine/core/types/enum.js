exports.actions = {
    edit: function (item) {
        const SELECT = document.createElement('SELECT');

        SELECT.onchange = () => {
            const content = SELECT.options[SELECT.selectedIndex].value;
            item.patch(content);
        };

        const choices = item.getSetting('choices') instanceof Array ? item.getSetting('choices') : [];

        if(!item.getSetting('default')){
            const OPTION = document.createElement('OPTION');
            OPTION.innerText = 'Select...';
            OPTION.disabled = true;
            OPTION.selected = true;
            SELECT.appendChild(OPTION);
        }

        const subSettings = item.getSetting('subType')|| {};
        const content = item.getContent();
        for (let choice of choices) {
            const OPTION = document.createElement('OPTION');
            if (choice === content) {
                OPTION.selected = true;
            }
            OPTION.innerText = choice; //TODO render choice content
            //OPTION.value = choice;
           // item.renderElement('view', item.getUri(), item.getStatus(), choice, subSettings, options);
            SELECT.appendChild(OPTION);
        }
        item.onChange(node => {
            //TODO use status
            const content = node.getContent();
            for (let id in SELECT.options ) {
                const OPTION = SELECT.options[id];
                if (OPTION.innerText === content) {
                    OPTION.selected = true;
                }
            }
        });
        return SELECT;
    },
    view: function (item) {
        const subSettings = item.getSetting('subType')|| {};
        // not item.onChange required this is handled by this:
        const TAG = item.renderElement('view', item.getUri(), item.getStatus(), item.getContent(), subSettings, item.getOptions());
        return TAG;
    },
    validateContent: function (item) {
        const choices = item.getSetting('choices');
        if (!choices instanceof Array) {
            return false;
        }
        return choices.indexOf(item.getContent()) !== -1;
    }
};