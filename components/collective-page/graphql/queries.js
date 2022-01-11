import { gql } from '@apollo/client';

import { gqlV2 } from '../../../lib/graphql/helpers';

import { MAX_CONTRIBUTORS_PER_CONTRIBUTE_CARD } from '../../contribute-cards/Contribute';
import { expensesListFieldsFragment } from '../../expenses/graphql/fragments';
import { transactionsQueryCollectionFragment } from '../../transactions/graphql/fragments';

import * as fragments from './fragments';

export const collectivePageQuery = gql`
  query CollectivePage($slug: String!, $nbContributorsPerContributeCard: Int) {
    Collective(slug: $slug, throwIfMissing: false) {
      id
      slug
      path
      name
      description
      longDescription
      backgroundImage
      backgroundImageUrl
      twitterHandle
      githubHandle
      website
      tags
      company
      type
      currency
      settings
      isActive
      isPledged
      isApproved
      isArchived
      isHost
      isIncognito
      isGuest
      hostFeePercent
      platformFeePercent
      image
      imageUrl(height: 256)
      canApply
      canContact
      features {
        ...NavbarFields
      }
      ordersFromCollective(subscriptionsOnly: true) {
        isSubscriptionActive
      }
      memberOf(onlyActiveCollectives: true, limit: 1) {
        id
      }
      stats {
        id
        balance
        balanceWithBlockedFunds
        yearlyBudget
        updates
        activeRecurringContributions
        totalAmountReceived(periodInMonths: 12)
        totalAmountRaised: totalAmountReceived
        totalNetAmountRaised: totalNetAmountReceived
        backers {
          id
          all
          users
          organizations
        }
        transactions {
          all
        }
      }
      connectedTo: memberOf(role: "CONNECTED_COLLECTIVE", limit: 1) {
        id
        collective {
          id
          name
          type
          slug
        }
      }
      parentCollective {
        id
        name
        slug
        image
        backgroundImageUrl
        twitterHandle
        type
        coreContributors: contributors(roles: [ADMIN, MEMBER]) {
          ...ContributorsFields
        }
      }
      host {
        id
        name
        slug
        type
        settings
        plan {
          id
          hostFees
          hostFeeSharePercent
        }
        features {
          id
          VIRTUAL_CARDS
        }
      }
      coreContributors: contributors(roles: [ADMIN, MEMBER]) {
        ...ContributorsFields
      }
      financialContributors: contributors(roles: [BACKER], limit: 150) {
        ...ContributorsFields
      }
      tiers {
        id
        name
        slug
        description
        useStandalonePage
        goal
        interval
        currency
        amount
        minimumAmount
        button
        amountType
        endsAt
        type
        maxQuantity
        stats {
          id
          availableQuantity
          totalDonated
          totalRecurringDonations
          contributors {
            id
            all
            users
            organizations
          }
        }
        contributors(limit: $nbContributorsPerContributeCard) {
          id
          image
          collectiveSlug
          name
          type
          isGuest
        }
      }
      events(includePastEvents: true, includeInactive: true) {
        id
        slug
        name
        description
        image
        isActive
        startsAt
        endsAt
        backgroundImageUrl(height: 208)
        contributors(limit: $nbContributorsPerContributeCard, roles: [BACKER, ATTENDEE]) {
          id
          image
          collectiveSlug
          name
          type
          isGuest
        }
        tiers {
          id
          type
        }
        stats {
          id
          backers {
            id
            all
            users
            organizations
          }
        }
      }
      projects {
        id
        slug
        name
        description
        image
        isActive
        isArchived
        backgroundImageUrl(height: 208)
        contributors(limit: $nbContributorsPerContributeCard, roles: [BACKER]) {
          id
          name
          image
          collectiveSlug
          type
        }
        stats {
          id
          backers {
            id
            all
            users
            organizations
          }
        }
      }
      connectedCollectives: members(role: "CONNECTED_COLLECTIVE") {
        id
        collective: member {
          id
          slug
          name
          type
          description
          backgroundImageUrl(height: 208)
          stats {
            id
            backers {
              id
              all
              users
              organizations
            }
          }
          contributors(limit: $nbContributorsPerContributeCard) {
            id
            image
            collectiveSlug
            name
            type
          }
        }
      }
      updates(limit: 3, onlyPublishedUpdates: true) {
        ...UpdatesFields
      }
      plan {
        id
        hostedCollectives
      }

      ... on Event {
        timezone
        startsAt
        endsAt
        location {
          name
          address
          country
          lat
          long
        }
        privateInstructions
        orders {
          id
          createdAt
          quantity
          publicMessage
          fromCollective {
            id
            type
            name
            company
            image
            imageUrl
            slug
            twitterHandle
            description
            ... on User {
              email
            }
          }
          tier {
            id
            name
            type
          }
        }
      }
    }
  }

  ${fragments.updatesFieldsFragment}
  ${fragments.contributorsFieldsFragment}
  ${fragments.collectiveNavbarFieldsFragment}
`;

export const budgetSectionQuery = gqlV2/* GraphQL */ `
  query BudgetSection($slug: String!, $limit: Int!, $kind: [TransactionKind]) {
    transactions(account: { slug: $slug }, limit: $limit, hasExpense: false, kind: $kind) {
      ...TransactionsQueryCollectionFragment
    }
    expenses(account: { slug: $slug }, limit: $limit) {
      totalCount
      nodes {
        ...ExpensesListFieldsFragment
      }
    }
  }
  ${transactionsQueryCollectionFragment}
  ${expensesListFieldsFragment}
`;

export const getCollectivePageQueryVariables = slug => {
  return {
    slug: slug,
    nbContributorsPerContributeCard: MAX_CONTRIBUTORS_PER_CONTRIBUTE_CARD,
  };
};
