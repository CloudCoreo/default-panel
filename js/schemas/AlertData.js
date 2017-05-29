window.AlertData = (function () {

    function AlertData() {
        this.level = {
            Critical: { count: 0 },
            High: { count: 0 },
            Medium: { count: 0 },
            Warning: { count: 0 },
            Low: { count: 0 },
            Manual: { count: 0 },
            Informational: { count: 0 }
        };
        this.category = {};
        this.region = {};
        this.service = {};
        this.meta_cis_id = {};
    }

    return AlertData;
}());