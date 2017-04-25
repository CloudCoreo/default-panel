window.Resource = function (resourceData) {
    return {
        resourceType: resourceData.resourceType || '',
        resourceName: resourceData.resourceName || '',
        dataType: resourceData.dataType || '',
        resourceId: resourceData.resourceId || '',
        namespace: resourceData.namespace || '',
        runId: resourceData.runId || '',
        stackName: resourceData.stackName || '',
        timestamp: resourceData.timestamp || '',
        _id: resourceData._id || '',
        inputs: {},
        outputs: {}
    }
};