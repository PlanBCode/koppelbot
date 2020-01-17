function State() {
    // let status;
    let created = false;
    let changed = false;
    let removed = false;
    //TODO let error = false;

    this.setCreated = () => {
        created = true;
    };
    this.setChanged = () => {
        changed = true;
    };
    this.setRemoved = () => {
        removed = true;
    };
    /*TODO this.setError = () => {
        error = true;
    };*/
    this.isChanged = () => changed && !created;
    this.isRemoved = () => removed;
    this.isCreated = () => created;
    //TODO this.isError = () => created;

    this.addSubState = subState => {
        if (subState.isChanged() || subState.isRemoved() || subState.isCreated()) {
            changed = true;
        }
    };
}

exports.State = State;