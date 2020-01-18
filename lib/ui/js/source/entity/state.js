function State() {
    // let status;
    let created = false;
    let changed = false;
    let removed = false;
    let error = false;
    const errors = [];

    let subStatus;

    this.getParentState = () => {
        const parentState = new State();
        if (changed || created || removed) parentState.setChanged();
        for (let error of errors) {
            parentState.setError(error.status, error.message);
        }
        //TODO ERROR
        return parentState;
    };
    
    this.setCreated = () => {
        created = true;
    };
    this.setChanged = () => {
        changed = true;
    };
    this.setRemoved = () => {
        removed = true;
    };
    this.setError = (status, message) => {
        error = true;
        errors.push({status, message})
    };
    this.isChanged = () => changed && !created;
    this.isRemoved = () => removed;
    this.isCreated = () => created;
    this.isError = () => error;

    this.getStatus = () => {
        // TODO mixed?
        if (this.isError()) return 404; //TODO support more errors etc
        if (this.isCreated()) return 201;
        if (this.isChanged()) return 201;
        if (this.isRemoved()) return 410;
        return 304;
    };

    this.addSubState = subState => {
        const newSubStatus = subState.getStatus();

        if (typeof subStatus === 'undefined') {
            subStatus = newSubStatus;
        } else if (newSubStatus !== subStatus) {
            subStatus = 207;
        }

        if (subState.isChanged() || subState.isRemoved() || subState.isCreated()) {
            changed = true;
        }
    };
}

exports.State = State;