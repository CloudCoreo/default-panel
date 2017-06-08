window.Templates = {

    violationBlockWrapper: function (options) {
        var bgColorClass = !options.isNoViolation ? 'bg-white' : 'bg-light-grey';
        return (
            '<div class="layout-padding ' + options.key + ' ' + bgColorClass + '" style="margin-bottom: 20px;">' +
            options.header +
            '<div class="' + bgColorClass + '">' + options.renderedBlock + '</div>' +
            '</div>'
        );
    },

    violationBlock: function (options) {
        return (
            '<div style="border-color: ' + options.color + ';">' +
            options.violationTpl.render(options.renderOptions) +
            '</div>'
        );
    },

    endOfViolationDivider: function () {
        return '<div class="violation-divider"><div class="text">end of violations</div></div>';
    }
};