exports.actions = {
    edit: function (item) {
        if (item.getOption('display') !== 'create') {
            const SPAN = document.createElement('SPAN');
            SPAN.innerText = 'Cannot edit login';
            return SPAN;
        }

        //TODO notify if caps lock is on
        const TABLE = document.createElement('TABLE');

        const TR_username = document.createElement('TR');
        const TD_usernameLabel = document.createElement('TD');
        const TD_usernameInput = document.createElement('TD');
        const INPUT_username = document.createElement('INPUT');
        TD_usernameLabel.innerText = 'Username';
        TD_usernameInput.appendChild(INPUT_username);
        TR_username.appendChild(TD_usernameLabel);
        TR_username.appendChild(TD_usernameInput);
        TABLE.appendChild(TR_username);

        const TR_password = document.createElement('TR');
        const TD_passwordLabel = document.createElement('TD');
        const TD_passwordInput = document.createElement('TD');
        const INPUT_password = document.createElement('INPUT');
        INPUT_password.type = 'password';
        TD_passwordLabel.innerText = 'Password';
        TD_passwordInput.appendChild(INPUT_password);
        TR_password.appendChild(TD_passwordLabel);
        TR_password.appendChild(TD_passwordInput);
        TABLE.appendChild(TR_password);

        const onChangeHandler = () => {
            item.patch({
                username: INPUT_username.value,
                password: INPUT_password.value
            });
        };
        INPUT_username.oninput = onChangeHandler;
        INPUT_password.oninput = onChangeHandler;
        return TABLE;
    },
    view: function (item) {
        const SPAN = document.createElement('SPAN');
        const content = item.getContent();
        SPAN.innerText = content.username;
        return SPAN;
    },
    validateContent: function (item) {
        const content = item.getContent();
        if (typeof content !== 'object' || content === null) return false;
        if (typeof content.password !== 'string') return false;
        if (typeof content.username !== 'string') return false;
        if (content.username === typeof content.password) return false;
        return true; // TODO min/max length, allow chars, regex
    },
    getIdFromContent: function (content) {
        return content.username;
    }
};