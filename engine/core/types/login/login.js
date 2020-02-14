exports.actions = {
    edit: function (item) {
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

        let INPUT_old;
        // if edit, not create then request also current password
        if (item.getOption('display') !== 'create') { // edit password -> confirm old + double to confirm
            const TR_old = document.createElement('TR');
            const TD_oldLabel = document.createElement('TD');
            const TD_oldInput = document.createElement('TD');
            INPUT_old = document.createElement('INPUT');
            INPUT_old.type = 'password';
            TD_oldLabel.innerText = 'Current';
            TD_oldInput.appendChild(INPUT_old);
            TR_old.appendChild(TD_oldLabel);
            TR_old.appendChild(TD_oldInput);
            TABLE.appendChild(TR_old);
        }

        // double to confirm
        const TR_new = document.createElement('TR');
        const TD_newLabel = document.createElement('TD');
        const TD_newInput = document.createElement('TD');
        const INPUT_new = document.createElement('INPUT');
        INPUT_new.type = 'password';
        TD_newLabel.innerText = 'Password';
        TD_newInput.appendChild(INPUT_new);
        TR_new.appendChild(TD_newLabel);
        TR_new.appendChild(TD_newInput);
        TABLE.appendChild(TR_new);


        const TR_confirm = document.createElement('TR');
        const TD_confirmLabel = document.createElement('TD');
        const TD_confirmInput = document.createElement('TD');
        const INPUT_confirm = document.createElement('INPUT');
        INPUT_confirm.type = 'password';
        TD_confirmLabel.innerText = 'Confirm';
        TD_confirmInput.appendChild(INPUT_confirm);
        TR_confirm.appendChild(TD_confirmLabel);
        TR_confirm.appendChild(TD_confirmInput);
        TABLE.appendChild(TR_confirm);

        if (item.getOption('display') !== 'create') { // edit password -> confirm old + double to confirm
            const TR_submit = document.createElement('TR');
            const TD_submit = document.createElement('TD');
            const INPUT_submit = document.createElement('INPUT');
            INPUT_submit.setAttribute('colspan', 2);
            INPUT_submit.type = 'Submit';
            INPUT_submit.value = 'Update';
            TD_submit.appendChild(INPUT_submit);
            TR_submit.appendChild(TD_submit);
            TABLE.appendChild(TR_submit);
            //TODO check if they match, if not: indicate!
            INPUT_submit.onclick = () => {
                item.patch({
                    old: INPUT_old.value,
                    new: INPUT_new.value,
                    confirm: INPUT_confirm.value,
                    username: INPUT_username.value
                })
            };
        } else { // create password : update data continuously
            const onChangeHandler = () => {
                if(INPUT_new.value !== INPUT_confirm.value){
                    INPUT_confirm.classList.add('xyz-invalid-content');
                }else {
                    INPUT_confirm.classList.remove('xyz-invalid-content');
                    item.patch({
                        // old: INPUT_old.value,
                        new: INPUT_new.value,
                        confirm: INPUT_confirm.value,
                        username: INPUT_username.value
                    });
                }
            };
            INPUT_new.oninput = onChangeHandler;
            INPUT_confirm.oninput = onChangeHandler;
        }
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
        if(typeof content !== 'object' || content === null) return false;
        if(typeof content.new !=='string') return false;
        if(typeof content.confirm !=='string') return false;
        if(typeof content.username !=='string') return false;
        return content.confirm === content.new; // TODO min/max length, allow chars, regex
    },
    getIdFromContent: function(content){
        return content.username;
    }
};