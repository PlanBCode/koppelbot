function Response(status_,content_,errors_) {
    const status = status_;
    const content = content_;
    const errors = errors_;
    this.getStatus = () => status;
    this.getContent = () => content;
    this.getErrors = () => errors;
}

exports.Reponse = Response;