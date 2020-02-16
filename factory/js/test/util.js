function match(a, d) {
    //TODO
    return true;
}

function TestResult(success, message) {
    this.validate = () => {
        if (!success) {
            throw message;
        }
    }
}

exports.match = match;
exports.TestResult = TestResult;