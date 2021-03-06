function State (method_) {
  // let status;
  let method = method_;
  let created = false;

  let changed = false; // entity has been changed
  let removed = false; // entity has been removed
  let extended = false; // properties have become available
  let error = false;
  const errors = [];

  let subStatus;
  this.getMethod = () => method;

  this.getParentState = () => {
    const parentState = new State(method);
    if (changed || created || removed) parentState.setChanged();
    for (const error of errors) {
      parentState.setError(error.status, error.message);
    }
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
    errors.push({status, message});
  };

  this.getErrors = () => errors;

  this.isChanged = () => (changed && !created) || removed;
  this.isRemoved = () => removed;
  this.isCreated = () => created;
  this.isExtended = () => extended && !created;
  this.hasErrors = () => error;

  this.getStatus = () => {
    // TODO mixed?
    if (this.hasErrors()) return 404; // TODO support more errors etc
    if (this.isCreated()) return 201;
    if (this.isChanged()) return 201;
    if (this.isRemoved()) return 410;
    return 304;
  };

  this.addSubState = subState => {
    const newSubStatus = subState.getStatus();
    if (subState.hasErrors()) {
      error = true;
      errors.push.apply(errors, subState.getErrors());
    }
    if (typeof subStatus === 'undefined') subStatus = newSubStatus;
    else if (newSubStatus !== subStatus) subStatus = 207;

    const subMethod = subState.getMethod();
    if (typeof method === 'undefined') method = subMethod;
    else if (method !== subMethod) throw new Error('A state cannot have multiple methods');

    if (subState.isChanged() || subState.isRemoved()) changed = true;

    if (subState.isCreated() || subState.isExtended()) extended = true;
  };
}

exports.State = State;
