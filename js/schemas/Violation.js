window.Violation = (function () {

    function Violation(data) {
        this.action = data.action || '';
        this.service = data.service || '';
        this.link = data.link || '';
        this.include_violations_in_count = data.include_violations_in_count || '';
        this.display_name = data.display_name || '';
        this.description = data.description || '';
        this.category = data.category || '';
        this.suggested_action = data.suggested_action || '';
        this.level = data.level || '';
        this.title = data.title || '';
        this.violationId = data.violationId || '';

        this.mergeOtherData(data);
    }

    function mergeOtherData(data) {
        Object.keys(data).forEach(_setValue.bind(this, data));
    }

    function _setValue(data, key) {
        this[key] = data[key];
    }


    Violation.prototype.mergeOtherData = mergeOtherData;

    return Violation;
}());