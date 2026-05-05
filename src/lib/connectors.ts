/**
 * Client-safe connector catalogue.
 * NO imports from composio-core — this file is safe to use in 'use client' components.
 */

export interface AppInputField {
  name: string
  label: string
  placeholder: string
  description: string
  required: boolean
}

export interface AppInfo {
  key: string
  displayName: string
  logo: string
  authSchemes: string[]
  actionsCount: number
  categories: string[]
  inputFields?: AppInputField[]   // fields to collect before OAuth (e.g. subdomain)
}

export const SUPPORTED_CONNECTORS: AppInfo[] = [
  {
    key: 'snowflake',
    displayName: 'Snowflake',
    logo: 'https://logos.composio.dev/api/snowflake',
    authSchemes: ['BASIC'],
    actionsCount: 15,
    categories: ['data-warehouse'],
    inputFields: [
      {
        name: 'Account ID',
        label: 'Account ID',
        placeholder: 'myorganization-myaccount',
        description: 'Your Snowflake account ID. Format: myorganization-myaccount (find it in the bottom-left account switcher in Snowsight).',
        required: true,
      },
      {
        name: 'Username',
        label: 'Username',
        placeholder: 'svc_cluezero',
        description: 'A service account username in Snowflake. No MFA required.',
        required: true,
      },
      {
        name: 'Password',
        label: 'Password',
        placeholder: '••••••••••••',
        description: 'Password for the service account.',
        required: true,
      },
      {
        name: 'role',
        label: 'Role',
        placeholder: 'SYSADMIN',
        description: 'Snowflake role to use. SYSADMIN or any role with SELECT on your tables.',
        required: false,
      },
    ],
  },
  {
    key: 'googleads',
    displayName: 'Google Ads',
    logo: 'https://logos.composio.dev/api/googleads',
    authSchemes: ['OAUTH2'],
    actionsCount: 42,
    categories: ['ad-platforms'],
  },
  {
    key: 'meta',
    displayName: 'Meta Ads',
    logo: 'https://logos.composio.dev/api/meta',
    authSchemes: ['OAUTH2'],
    actionsCount: 38,
    categories: ['ad-platforms'],
  },
  {
    key: 'asana',
    displayName: 'Asana',
    logo: 'https://logos.composio.dev/api/asana',
    authSchemes: ['OAUTH2'],
    actionsCount: 56,
    categories: ['output-tools'],
  },
  {
    key: 'clickup',
    displayName: 'ClickUp',
    logo: 'https://logos.composio.dev/api/clickup',
    authSchemes: ['OAUTH2', 'API_KEY'],
    actionsCount: 48,
    categories: ['output-tools'],
  },
  {
    key: 'googlesheets',
    displayName: 'Google Sheets',
    logo: 'https://logos.composio.dev/api/googlesheets',
    authSchemes: ['OAUTH2'],
    actionsCount: 40,
    categories: ['spreadsheet'],
  },
  {
    key: 'airtable',
    displayName: 'Airtable',
    logo: 'https://logos.composio.dev/api/airtable',
    authSchemes: ['OAUTH2', 'API_KEY'],
    actionsCount: 23,
    categories: ['database'],
  },
  {
    key: 'notion',
    displayName: 'Notion',
    logo: 'https://logos.composio.dev/api/notion',
    authSchemes: ['OAUTH2'],
    actionsCount: 45,
    categories: ['database'],
  },
  {
    key: 'hubspot',
    displayName: 'HubSpot',
    logo: 'https://logos.composio.dev/api/hubspot',
    authSchemes: ['OAUTH2'],
    actionsCount: 232,
    categories: ['crm'],
  },
  {
    key: 'salesforce',
    displayName: 'Salesforce',
    logo: 'https://logos.composio.dev/api/salesforce',
    authSchemes: ['OAUTH2'],
    actionsCount: 179,
    categories: ['crm'],
  },
  {
    key: 'databricks',
    displayName: 'Databricks',
    logo: 'https://logos.composio.dev/api/databricks',
    authSchemes: ['OAUTH2', 'API_KEY'],
    actionsCount: 409,
    categories: ['data-warehouse'],
  },
]
