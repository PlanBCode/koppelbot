exports.actions = {
    edit: function (xyz, uri, status, content, settings, options, onChange) {
        settings = settings || {};
        const SELECT = document.createElement('SELECT');
        SELECT.onchange = () => {
            const content = SELECT.options[SELECT.selectedIndex].value;
            onChange(content);
        };

        const choices = settings.choices instanceof Array ? settings.choices : [];
        // TODO select default by default
        for (let choice of choices) {
            const OPTION = document.createElement('OPTION');
            if (choice === content) {
                OPTION.selected = true;
            }
            OPTION.innerText = choice; //TODO render choice content
            // xyz.renderElement('view', uri, status, content, subSettings, options)
            SELECT.appendChild(OPTION);
        }
        return SELECT;
    },
    view: function (xyz, uri, status, content, settings, options) {
        const subSettings = settings.subType || {};
        const TAG = xyz.renderElement('view', uri, status, content, subSettings, options);
        return TAG;
    },
    validate: function (xyz, uri, status, content, settings, options) {
        if (typeof settings !== 'object' || settings === null) {
            return false;
        }
        const choices = settings.choices;
        if (!choices instanceof Array) {
            return false;
        }
        return choices.indexOf(content) !== -1;
    }
};