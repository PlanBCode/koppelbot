exports.actions = {
    edit: function (item) {
        const SELECT = document.createElement('SELECT');
        SELECT.onchange = () => {
            const content = SELECT.options[SELECT.selectedIndex].value;
            item.patch(content);
        };

        const choices = item.hasSetting('choices') instanceof Array ? item.getSetting('choices') : [];
        // TODO select default by default

        const subSettings = item.getSetting('subType')|| {};
        const content = item.getContent();
        for (let choice of choices) {
            const OPTION = document.createElement('OPTION');
            if (choice === content) {
                OPTION.selected = true;
            }
            OPTION.innerText = choice; //TODO render choice content
           // item.renderElement('view', item.getUri(), item.getStatus(), choice, subSettings, options);
            SELECT.appendChild(OPTION);
        }
        return SELECT;
    },
    view: function (item) {
        const subSettings = item.getSetting('subType')|| {};
        const TAG = item.renderElement('view', item.getUri(), item.getStatus(), item.getContent(), subSettings, item.getOptions());
        return TAG;
    },
    validate: function (item) {
        const choices = item.getSetting('choices');
        if (!choices instanceof Array) {
            return false;
        }
        return choices.indexOf(item.getContent()) !== -1;
    }
};