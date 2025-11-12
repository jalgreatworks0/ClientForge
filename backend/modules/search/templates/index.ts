/**
 * Search Module Templates
 * 10 example search query templates for Elasticsearch
 */

// 1. Contact Full-Text Search Template
export const contactFullTextSearchTemplate = {
  id: 'contact-full-text',
  name: 'Contact Full-Text Search',
  index: 'contacts',
  queryType: 'multi_match',
  fields: ['first_name', 'last_name', 'email', 'company', 'title'],
  example: { query: 'john smith tech', fuzzy: true, results: 15 },
};

// 2. Deal Value Range Search Template
export const dealValueRangeSearchTemplate = {
  id: 'deal-value-range',
  name: 'Deal Value Range',
  index: 'deals',
  queryType: 'range',
  field: 'value',
  example: { min: 10000, max: 100000, results: 23 },
};

// 3. Account Industry Filter Template
export const accountIndustryFilterTemplate = {
  id: 'account-industry-filter',
  name: 'Account Industry Filter',
  index: 'accounts',
  queryType: 'term',
  field: 'industry',
  example: { industry: 'Software', results: 45 },
};

// 4. Activity Timeline Search Template
export const activityTimelineSearchTemplate = {
  id: 'activity-timeline',
  name: 'Activity Timeline Search',
  index: 'activities',
  queryType: 'range',
  field: 'timestamp',
  example: { from: '2025-11-01', to: '2025-11-30', results: 342 },
};

// 5. Fuzzy Contact Name Search Template
export const fuzzyContactNameSearchTemplate = {
  id: 'fuzzy-contact-name',
  name: 'Fuzzy Contact Name',
  index: 'contacts',
  queryType: 'fuzzy',
  field: 'name',
  fuzziness: 'AUTO',
  example: { query: 'jon smyth', matches: ['John Smith', 'Jon Smith', 'Joan Smith'] },
};

// 6. Deal Stage Aggregation Template
export const dealStageAggregationTemplate = {
  id: 'deal-stage-aggregation',
  name: 'Deal Stage Aggregation',
  index: 'deals',
  queryType: 'aggregation',
  aggregationType: 'terms',
  field: 'stage',
  example: { stages: [{name: 'Lead', count: 23}, {name: 'Qualified', count: 15}] },
};

// 7. Email Domain Search Template
export const emailDomainSearchTemplate = {
  id: 'email-domain-search',
  name: 'Email Domain Search',
  index: 'contacts',
  queryType: 'wildcard',
  field: 'email',
  example: { query: '*@example.com', results: 12 },
};

// 8. Geo-Location Proximity Search Template
export const geoProximitySearchTemplate = {
  id: 'geo-proximity',
  name: 'Geo-Location Proximity',
  index: 'accounts',
  queryType: 'geo_distance',
  field: 'location',
  example: { lat: 40.7128, lon: -74.0060, distance: '50km', results: 18 },
};

// 9. Advanced Boolean Search Template
export const booleanSearchTemplate = {
  id: 'boolean-search',
  name: 'Advanced Boolean Search',
  index: 'contacts',
  queryType: 'bool',
  must: [{ term: { status: 'active' } }],
  should: [{ match: { company: 'tech' } }],
  must_not: [{ term: { unsubscribed: true } }],
  example: { active_tech_contacts: 67, excluding_unsubscribed: true },
};

// 10. Recent Activities Boost Template
export const recentActivitiesBoostTemplate = {
  id: 'recent-activities-boost',
  name: 'Recent Activities Boost',
  index: 'contacts',
  queryType: 'function_score',
  boostFactor: 'recency',
  example: { query: 'high value clients', boost_recent_engagement: true, results: 34 },
};

// Export all templates
export const searchTemplates = [
  contactFullTextSearchTemplate,
  dealValueRangeSearchTemplate,
  accountIndustryFilterTemplate,
  activityTimelineSearchTemplate,
  fuzzyContactNameSearchTemplate,
  dealStageAggregationTemplate,
  emailDomainSearchTemplate,
  geoProximitySearchTemplate,
  booleanSearchTemplate,
  recentActivitiesBoostTemplate,
];

// Example combined search query
export const exampleComplexSearch = {
  description: 'Find active tech contacts in NY with deals > $50k',
  indices: ['contacts', 'deals'],
  query: {
    bool: {
      must: [
        { match: { industry: 'Technology' } },
        { geo_distance: { location: { lat: 40.7128, lon: -74.0060 }, distance: '50km' } },
      ],
      filter: [
        { range: { deal_value: { gte: 50000 } } },
        { term: { status: 'active' } },
      ],
    },
  },
  expectedResults: 12,
};
