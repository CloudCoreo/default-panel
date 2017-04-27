window.Resource = (function () {

    function Resource(resourceData) {
        this.resourceType = resourceData.resourceType || '';
        this.resourceName = resourceData.resourceName || '';
        this.dataType = resourceData.dataType || '';
        this.resourceId = resourceData.resourceId || '';
        this.namespace = resourceData.namespace || '';
        this.runId = resourceData.runId || '';
        this.stackName = resourceData.stackName || '';
        this.timestamp = resourceData.timestamp || '';
        this._id = resourceData._id || '';
        this.inputs = {};
        this.outputs = {};
    }

    return Resource;
}());