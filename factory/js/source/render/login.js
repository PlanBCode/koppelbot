/*

options.signUpButtonText || 'Create account',
options.loginButtonText || 'Log in',
 */

const renderUiLogin = (xyz, options, WRAPPER) => {
    WRAPPER.classList.add('xyz-login');
    const A_signin = document.createElement('A');
    A_signin.innerText = 'sign in'; //TODO parametrize
    const A_signup = document.createElement('A');
    A_signup.innerText = 'sign up';//TODO parametrize
    WRAPPER.appendChild(A_signin);
    WRAPPER.appendChild(A_signup);

    const DIV_message = document.createElement('DIV');
    DIV_message.classList.add('xyz-login-message');

    const showMessage = message => {
        DIV_message.innerText = message;
        DIV_message.style.display = 'inherit';
        DIV_message.onclick = () => {
            DIV_message.style.display = 'none';
        }
        DIV_message.style.animationName = 'none';
        DIV_message.offsetHeight; //trigger reflow
        //${this.class}_stand_sprite 1s step-end 1
        DIV_message.style.animationName = 'xyz-login-hide';
    }
    WRAPPER.appendChild(DIV_message);

    const DIV_listSession = document.createElement('SPAN');

    xyz.ui({
        style: 'display:none;',
        uri: options.uri + '/*/login', //TODO parametrize
        display: 'list',
        showHeader: false
    }, DIV_listSession);
    WRAPPER.appendChild(DIV_listSession);

    const A_logout = document.createElement('A');
    A_logout.innerText = 'log out';
    A_logout.onclick = () => {
        xyz.delete(options.uri);
    };
    A_logout.style.display = 'none';

    WRAPPER.appendChild(A_logout);

    const DIV_createSession = document.createElement('DIV');

    xyz.ui({
        style: 'display:none;',
        uri: options.uri,
        display: 'create',
        showHeader: false,
        createButtonText: options.loginButtonText || 'Log in',
        onSubmit: data => {
            DIV_listSession.style.display = 'inline-block';
            DIV_createSession.style.display = 'none';
            A_signin.style.display = 'none';
            A_signup.style.display = 'none';
            A_logout.style.display = 'inline-block';
        }
    }, DIV_createSession);

    xyz.on('/session/*', 'created', (entityClassName, entityId, subNode, eventName) => {
        showMessage('Successfully signed in.');
        DIV_listSession.style.display = 'inline-block';
        DIV_createSession.style.display = 'none';
        A_signin.style.display = 'none';
        A_signup.style.display = 'none';
        A_logout.style.display = 'inline-block';
    });
    xyz.on('/session/*', 'removed', (entityClassName, entityId, subNode, eventName) => {
        showMessage('Successfully logged out.');
        A_signin.style.display = 'inline-block';
        A_signup.style.display = 'inline-block';
        A_logout.style.display = 'none';
        //TODO only if all sessions gone
        //TODO show logout message "You've been successfully logged out."
        DIV_listSession.style.display = 'none';
    });
    WRAPPER.appendChild(DIV_createSession);

    const DIV_account = document.createElement('DIV');
    xyz.ui({
        uri: '/account',
        style: 'display:none;',
        display: 'create',
        createButtonText: options.signUpButtonText || 'Create account',
        onSubmit: data => {
            showMessage('Account successfully created, please log in to continue. Please note that the admin will need to set your permissions.');

            //TODO Message "account x has been created"
            //TODO use date to fill in username
            //console.log('create Account', data);
            DIV_createSession.style.display = 'block';
            DIV_account.style.display = 'none';
        }
    }, DIV_account); //TODO retrieve /account from session metadata?
    WRAPPER.appendChild(DIV_account);

    A_signin.onclick = () => {
        DIV_createSession.style.display = 'block';
        DIV_account.style.display = 'none';
    };
    A_signup.onclick = () => {
        DIV_account.style.display = 'block';
        DIV_createSession.style.display = 'none';
    };
};

exports.renderUiLogin = renderUiLogin;