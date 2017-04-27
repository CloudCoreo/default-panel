window.constants = {

    CONTAINERS: {
        mainDataContainerSelector: '.list',
        noViolation: '.no-violation',
        noAuditResourcesMessageSelector: '#no-violation-resources',
        noViolationsMessageSelector: '#no-violations-view',
        pieChartSelector: '.pie',
        errorsContSelector: '#advisor-errors',
        mainCont: '.audit-list',
        planIsExecuting: '.resources-are-loading',
        endOfViolationLabel: '.violation-divider',
        warningBlock: '.warning-block'
    },

    TEMPLATES: {
        LIST_HEADER: '#list-header-tmpl',
        VIOLATION_ROW: '#row-tmpl',
        PASSED_DISABLED_ROW: '#passed-and-disabled-row',
        VIOLATION_ERROR: '#violation-error-tpl'
    },

    COLORS: {
        SeverityTones: {
            High: '#E53E2B',
            Medium: '#E49530',
            Low: '#EAC907',
            Informational: '#6b6b6b',
            Debug: '#c4c4c4'
        },
        Passed: '#2dbf74',
        Disabled: '#cccccc',
        PurpleTones: ['#582a7f', '#bf4a95', '#c4c4c4', '#6b6b6b', '#272e39'],
        CoolTones: ['#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'],
        RainbowTones: ['#582a7f', '#bf4a95', '#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'],
        Default: d3.schemeCategory20
    },

    POPUPS: {
        VIOLATION_RESOURCES: 'showViolationResources',
        SHARE_VIOLATION: 'shareViolation',
        VIOLATION_MORE_INFO: 'showViolationMoreInfo',
        REDIRECT_TO_COMPOSITES: 'redirectToCommunityComposites',
        REDIRECT_TO_RESOURCES: 'redirectToResources'
    },

    REQUEST: {
        GET_TRUNCATED_OBJ: 'getTruncatedObject'
    },

    ENGINE_STATES: {
        INITIALIZED: 'INITIALIZED',
        COMPILING: 'COMPILING',
        COMPILED: 'COMPILED',
        EXECUTING: 'EXECUTING',
        PLANNED: 'PLANNED',
        COMPLETED: 'COMPLETED'
    },

    ENGINE_STATUSES: {
        OK: 'OK',
        SUCCESS: 'SUCCESS',
        ERROR: 'ERROR'
    },

    RESOURCE_TYPES: {
        COREO_AWS_RULE: 'coreo_aws_rule',
        COREO_UNI_UTIL: 'coreo_uni_util',
        AWS_IAM: 'aws_iam_',
        AWS_ROUTE53: 'aws_route53_',
        AWS_EC2: 'aws_ec2_',
        AWS_ELASTICACHE: 'aws_elasticache_',
        AWS_S3: 'aws_s3_',
        AWS_VPC: 'aws_vpc_',
        AWS_VPN: 'aws_vpn_'
    },

    UITEXTS: {
        BUTTONS: {
            SHOW_LESS: 'show less',
            VIEW_ALL: 'view all',
            HIDE_DETAILS: '- hide details',
            VIEW_DETAILS: '+ view details'
        }
    }

};