window.Constants = {

    CONTAINERS: {
        mainDataContainerSelector: '.list',
        informational: '.informational',
        noViolation: '.no-violation',
        noAuditResourcesMessageSelector: '#no-violation-resources',
        noViolationsMessageSelector: '#no-violations-view',
        noRulesMessageSelector: '#no-rules-view',
        pieChartSelector: '.pie',
        errorsContSelector: '#advisor-errors',
        mainCont: '.audit-list',
        planIsExecuting: '.resources-are-loading',
        endOfViolationLabel: '.violation-divider',
        warningBlock: '.warning-block',
        CHART_HEADER: '.pie-data-header .chart-header'
    },

    TEMPLATE_IDS: {
        LIST_HEADER: '#list-header-tmpl',
        VIOLATION_ROW: '#row-tmpl',
        PASSED_DISABLED_ROW: '#passed-and-disabled-row',
        VIOLATION_ERROR: '#violation-error-tpl',
        ERROR_BLOCK: '#run-error'
    },

    COLORS: {
        SeverityTones: {
            High: '#E53E2B',
            Medium: '#E49530',
            Low: '#EAC907',
            Informational: '#6b6b6b',
            Debug: '#c4c4c4',
            Warning: '#582a7f',
            Manual: '#005d14'
        },
        Passed: '#2dbf74',
        Disabled: '#cccccc',
        PurpleTones: ['#582a7f', '#bf4a95', '#c4c4c4', '#6b6b6b', '#272e39'],
        CoolTones: ['#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'],
        RainbowTones: ['#582a7f', '#bf4a95', '#2dbf74', '#39c4cc', '#2b7ae5', '#c4c4c4', '#6b6b6b', '#272e39'],
        Default: d3.schemeCategory20
    },

    REGIONS: {
        CLOUDCOREO: 'CloudCoreo',
        AWS: 'AWS',
        MAP_REGIONS: {
            'North America': {
                region: 'North America',
                img: './images/maps/north-america.svg',
                cssClass: 'north-america',
                awsRegions: [
                    'us-east-1',
                    'us-east-2',
                    'us-west-1',
                    'us-west-2',
                    'ca-central-1'
                ]
            },
            'South America': {
                region: 'South America',
                img: './images/maps/south-america.svg',
                cssClass: 'south-america',
                awsRegions: [
                    'sa-east-1'
                ]
            },
            'Asia Pacific': {
                region: 'Asia Pacific',
                img: './images/maps/asia-pacific.svg',
                cssClass: 'asia-pacific',
                awsRegions: [
                    'ap-northeast-1',
                    'ap-southeast-1',
                    'ap-southeast-2',
                    'ap-south-1',
                    'ap-northeast-2'
                ]
            },
            'Europe / Middle East / Africa': {
                region: 'Europe / Middle East / Africa',
                img: './images/maps/europe-middle-east-africa.svg',
                cssClass: 'europe',
                awsRegions: [
                    'eu-central-1',
                    'eu-west-1',
                    'eu-west-2'
                ]
            },
            'Global': {
                region: 'Global',
                cssClass: 'global-region',
                awsRegions: [
                    'AWS',
                    'CloudCoreo'
                ]
            }
        },

        REGION_LIST: {
            'ca-central-1': {
                region: 'North America'
            },
            'ap-northeast-1': {
                region: 'Asia Pacific',
                city: 'Tokyo',
                latitude: 35.6735763,
                longitude: 139.4302066,
                countryId: 'JPN'
            },
            'ap-southeast-1': {
                region: 'Asia Pacific',
                city: 'Singapore',
                latitude: 1.3154015,
                longitude: 103.566832,
                countryId: 'IDN'
            },
            'ap-southeast-2': {
                region: 'Asia Pacific',
                city: 'Sydney',
                latitude: -33.8458826,
                longitude: 150.3715633,
                countryId: 'AUS'
            },
            'eu-central-1': {
                region: 'Europe / Middle East / Africa',
                city: 'Frankfurt',
                latitude: 50.1213152,
                longitude: 8.3563887,
                countryId: 'DEU'
            },
            'eu-west-1': {
                region: 'Europe / Middle East / Africa',
                city: 'Ireland', latitude: 53.4098083,
                longitude: -10.5742474,
                countryId: 'IRL'
            },
            'eu-west-2': {
                region: 'Europe / Middle East / Africa',
            },
            'sa-east-1': {
                region: 'South America',
                city: 'Sao Paolo',
                latitude: -23.6815315,
                longitude: -46.8754815,
                countryId: 'BRA'
            },
            'us-east-1': {
                region: 'North America',
                city: 'N. Virginia',
                latitude: 37.9266816,
                longitude: -83.9481084,
                countryId: 'USA'
            },
            'us-east-2': {
                region: 'North America',
                city: 'Ohio',
                latitude: 40.1685993,
                longitude: -84.9182274,
                countryId: 'USA'
            },
            'us-west-1': {
                region: 'North America',
                city: 'N. California',
                latitude: 38.8207129,
                longitude: -124.5542165,
                countryId: 'USA'
            },
            'us-west-2': {
                region: 'North America',
                city: 'Oregon',
                latitude: 44.061906,
                longitude: -125.0254052,
                countryId: 'USA'
            },
            'ap-south-1': {
                region: 'Asia Pacific',
                city: 'Mumbai',
                latitude: 19.0830943,
                longitude: 72.7411199,
                countryId: 'IND'
            },
            'ap-northeast-2': {
                region: 'Asia Pacific',
                city: 'Seoul',
                latitude: 37.5653133,
                longitude: 126.7093693,
                countryId: 'KOR'
            },
            'CloudCoreo': {region: 'Global'},
            'AWS': {region: 'Global'}
        }
    },

    POPUPS: {
        VIOLATION_RESOURCES: 'showViolationResources',
        SHARE_VIOLATION: 'shareViolation',
        VIOLATION_MORE_INFO: 'showViolationMoreInfo',
        REDIRECT_TO_COMPOSITES: 'redirectToCommunityComposites',
        REDIRECT_TO_RESOURCES: 'redirectToResources',
        SHOW_ERROR: 'showErrorModal'
    },

    REQUEST: {
        GET_TRUNCATED_OBJ: 'getTruncatedObject'
    },

    RESOURCE_TYPE: {
        ADVISOR_RESOURCE: 'ADVISOR_RESOURCE'
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
        ERROR: 'ERROR',
        EXECUTION_ERROR: 'EXECUTION_ERROR'
    },

    PRIORITY_OF_LEVELS: {
        Critical: 1,
        High: 2,
        Medium: 3,
        Warning: 4,
        Low: 5,
        Manual: 6,
        Informational: 7
    },

    VIOLATION_LEVELS: {
        HIGH: {
            name: 'High',
            isViolation: true
        },
        MEDIUM: {
            name: 'Medium',
            isViolation: true
        },
        LOW: {
            name: 'Low',
            isViolation: true
        },
        WARNING: {
            name: 'Warning',
            isViolation: true
        },
        MANUAL: {
            name: 'Manual',
            isViolation: false
        },
        INTERNAL: {
            name: 'Internal',
            isViolation: false
        },
        INFORMATIONAL: {
            name: 'Informational',
            isViolation: false
        }
    },

    VIEW_TYPE: {
        AUDIT: 'audit',
        MAP: 'map'
    },

    RESULT_TYPE: {
        RULES: 'RULES',
        VIOLATIONS: 'VIOLATIONS',
        INFORMATIONAL: 'Informational'
    },

    SERVICES: {
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

    ORGANIZATION_TYPE: {
        SORT: 'sort',
        GROUP: 'group'
    },

    SORTKEYS: {
        level: {
            name: 'level',
            label: 'Level',
            isSorting: false
        },
        category: {
            name: 'category',
            label: 'Category',
            isSorting: false
        },
        service: {
            name: 'service',
            label: 'Service',
            isSorting: false
        },
        region: {
            name: 'region',
            label: 'Region',
            isSorting: false
        },
        meta_cis_id: {
            name: 'meta_cis_id',
            label: 'CIS',
            isSorting: true
        },
        meta_nist_171_id: {
            name: 'meta_nist_171_id',
            label: 'NIST',
            isSorting: true
        }
    },

    BLOCK_HEADERS: {
        'meta_cis_id': 'CIS ID',
        'meta_nist_171_id': 'NIST 800-171 ID',
        'us-east-1': 'US East 1',
        'us-east-2': 'US East 2',
        'us-west-1': 'US West 1',
        'us-west-2': 'US West 2',
        'ca-central-1': 'CA Central 1',
        'sa-east-1': 'SA East 1',
        'ap-northeast-1': 'AP Northeast 1',
        'ap-southeast-1': 'AP Southeast 1',
        'ap-southeast-2': 'AP Southeast 2',
        'ap-south-1': 'AP South 1',
        'ap-northeast-2': 'AP Northeast 2',
        'eu-central-1': 'EU Central 1',
        'eu-west-1': 'EU West 1',
        'eu-west-2': 'EU West 2'
    }
};