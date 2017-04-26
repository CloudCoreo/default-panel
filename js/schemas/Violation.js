window.Violation = function (data) {

    var violationSchema = {
        action: data.action || '',
        service: data.service || '',
        link: data.link || '',
        include_violations_in_count: data.include_violations_in_count || '',
        display_name: data.display_name || '',
        description: data.description || '',
        category: data.category || '',
        suggested_action: data.suggested_action || '',
        level: data.level || '',
        title: data.title || '',
        violationId: data.violationId || ''
    };

    Object.keys(data).forEach(function (key) {
        violationSchema[key] = data[key];
    });

    return violationSchema;
};