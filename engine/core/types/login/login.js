exports.actions = {
  edit: function (item) {
    if (item.getOption('display') !== 'create') {
      const SPAN = document.createElement('SPAN');
      SPAN.innerText = 'Cannot edit login';
      return SPAN;
    }

    // TODO notify if caps lock is on
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
    TD_passwordLabel.innerText = 'Password'; // TODO parametrize
    TD_passwordInput.appendChild(INPUT_password);
    TR_password.appendChild(TD_passwordLabel);
    TR_password.appendChild(TD_passwordInput);
    TABLE.appendChild(TR_password);

    const TR_capsLockNotifier = document.createElement('TR');
    const TD_capsLockNotifier = document.createElement('TD');
    TD_capsLockNotifier.innerText = 'CAPS LOCK is on'; // TODO parametrize
    TD_capsLockNotifier.setAttribute('colspan', 2);
    TD_capsLockNotifier.classList.add('xyz-login-capslock-notifier');
    TR_capsLockNotifier.style.display = 'none';
    TR_capsLockNotifier.appendChild(TD_capsLockNotifier);
    TABLE.appendChild(TR_capsLockNotifier);

    INPUT_password.addEventListener('keyup', function (e) {
      TR_capsLockNotifier.style.display = e.getModifierState('CapsLock') ? 'table-row' : 'none';
    });

    const onChangeHandler = node => {
      const content = node.getContent();
      if (typeof content !== 'object' || content === null) {
        INPUT_username.value = INPUT_password.value = '';
      } else {
        if (INPUT_username !== document.activeElement && content.hasOwnProperty('username')) { // we don't want to interrupt typing
          INPUT_username.value = content.username;
        }
        if (INPUT_password !== document.activeElement && content.hasOwnProperty('password')) { // we don't want to interrupt typing
          INPUT_password.value = content.password;
        }
      }
    };
    onChangeHandler(item);
    item.onChange(onChangeHandler);

    if (item.patch) {
      INPUT_password.oninput = INPUT_username.oninput = () => item.patch({
        username: INPUT_username.value,
        password: INPUT_password.value
      });
    }

    return TABLE;
  },
  view: function (item) {
    const SPAN = document.createElement('SPAN');
    const content = item.getContent();
    if (typeof content === 'object' && content !== null) {
      SPAN.innerText = content.username;
    } else {
      SPAN.innerText = 'ERROR';// TODO
    }
    return SPAN;
  },
  validateContent: function (item) {
    const content = item.getContent();
    if (typeof content !== 'object' || content === null) return false;
    if (typeof content.password !== 'string') return false;
    if (typeof content.username !== 'string') return false;
    if (content.password === '') return false;
    if (content.username === '') return false;
    if (content.username === typeof content.password) return false;
    return true; // TODO min/max length, allowed chars, regex
  },
  getIdFromContent: function (content) {
    return content.username;
  }
};
