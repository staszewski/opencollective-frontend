import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';
import { Download as IconDownload } from '@styled-icons/feather/Download';
import { get, isNil, omitBy } from 'lodash';
import { withRouter } from 'next/router';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';

import { isSectionForAdminsOnly, NAVBAR_CATEGORIES } from '../lib/collective-sections';
import { CollectiveType } from '../lib/constants/collectives';
import roles from '../lib/constants/roles';
import { parseDateInterval } from '../lib/date-utils';
import { getErrorFromGraphqlException } from '../lib/errors';
import { API_V2_CONTEXT, gqlV2 } from '../lib/graphql/helpers';
import { getCanonicalURL, getCollectivePageRoute } from '../lib/url-helpers';

import Body from '../components/Body';
import { parseAmountRange } from '../components/budget/filters/AmountFilter';
import CollectiveNavbar from '../components/collective-navbar';
import { Sections } from '../components/collective-page/_constants';
import { collectiveNavbarFieldsFragment } from '../components/collective-page/graphql/fragments';
import ErrorPage from '../components/ErrorPage';
import Footer from '../components/Footer';
import { Box, Flex } from '../components/Grid';
import Header from '../components/Header';
import Link from '../components/Link';
import Loading from '../components/Loading';
import MessageBox from '../components/MessageBox';
import Page from '../components/Page';
import PageFeatureNotSupported from '../components/PageFeatureNotSupported';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import StyledButton from '../components/StyledButton';
import StyledCheckbox from '../components/StyledCheckbox';
import StyledHr from '../components/StyledHr';
import { H1 } from '../components/Text';
import { getDefaultKinds, parseTransactionKinds } from '../components/transactions/filters/TransactionsKindFilter';
import { transactionsQueryCollectionFragment } from '../components/transactions/graphql/fragments';
import TransactionsDownloadCSV from '../components/transactions/TransactionsDownloadCSV';
import TransactionsFilters from '../components/transactions/TransactionsFilters';
import TransactionsList from '../components/transactions/TransactionsList';
import { withUser } from '../components/UserProvider';

const transactionsPageQuery = gqlV2/* GraphQL */ `
  query TransactionsPage(
    $slug: String!
    $limit: Int!
    $offset: Int!
    $type: TransactionType
    $minAmount: Int
    $maxAmount: Int
    $dateFrom: DateTime
    $dateTo: DateTime
    $searchTerm: String
    $kind: [TransactionKind]
    $includeIncognitoTransactions: Boolean
    $includeGiftCardTransactions: Boolean
    $includeChildrenTransactions: Boolean
  ) {
    account(slug: $slug) {
      id
      legacyId
      slug
      name
      type
      createdAt
      imageUrl(height: 256)
      currency
      features {
        ...NavbarFields
      }
      ... on AccountWithParent {
        parent {
          id
          slug
        }
      }
    }
    transactions(
      account: { slug: $slug }
      limit: $limit
      offset: $offset
      type: $type
      minAmount: $minAmount
      maxAmount: $maxAmount
      dateFrom: $dateFrom
      dateTo: $dateTo
      searchTerm: $searchTerm
      kind: $kind
      includeIncognitoTransactions: $includeIncognitoTransactions
      includeGiftCardTransactions: $includeGiftCardTransactions
      includeChildrenTransactions: $includeChildrenTransactions
      includeDebts: true
    ) {
      ...TransactionsQueryCollectionFragment
    }
  }
  ${transactionsQueryCollectionFragment}
  ${collectiveNavbarFieldsFragment}
`;

const TransactionPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  #footer {
    margin-top: auto;
  }
`;

const EXPENSES_PER_PAGE = 15;

const getVariablesFromQuery = query => {
  const amountRange = parseAmountRange(query.amount);
  const { from: dateFrom, to: dateTo } = parseDateInterval(query.period);
  return {
    offset: parseInt(query.offset) || 0,
    limit: parseInt(query.limit) || EXPENSES_PER_PAGE,
    type: query.type,
    status: query.status,
    tags: query.tag ? [query.tag] : undefined,
    minAmount: amountRange[0] && amountRange[0] * 100,
    maxAmount: amountRange[1] && amountRange[1] * 100,
    payoutMethodType: query.payout,
    dateFrom,
    dateTo,
    searchTerm: query.searchTerm,
    kind: query.kind ? parseTransactionKinds(query.kind) : getDefaultKinds(),
    includeIncognitoTransactions: !query.ignoreIncognitoTransactions,
    includeGiftCardTransactions: !query.ignoreGiftCardsTransactions,
    includeChildrenTransactions: !query.ignoreChildrenTransactions,
  };
};

class TransactionsPage extends React.Component {
  static async getInitialProps({ query: { collectiveSlug, ...query } }) {
    return { slug: collectiveSlug, query };
  }

  static propTypes = {
    slug: PropTypes.string, // from getInitialProps, for addCollectiveNavbarData
    data: PropTypes.shape({
      account: PropTypes.object,
      transactions: PropTypes.shape({
        nodes: PropTypes.array,
      }),
      variables: PropTypes.object,
      loading: PropTypes.bool,
      refetch: PropTypes.func,
      error: PropTypes.any,
    }).isRequired, // from withData
    LoggedInUser: PropTypes.object,
    query: PropTypes.shape({
      searchTerm: PropTypes.string,
      ignoreIncognitoTransactions: PropTypes.string,
      ignoreGiftCardsTransactions: PropTypes.string,
      ignoreChildrenTransactions: PropTypes.string,
    }),
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = { Collective: get(props, 'data.account') };
  }

  async componentDidMount() {
    const { router, data } = this.props;
    const Collective = (data && data.account) || this.state.collective;
    const query = router.query;
    this.setState({ Collective });
    if ([CollectiveType.EVENT, CollectiveType.PROJECT].includes(Collective.type) && !query.parentCollectiveSlug) {
      router.push(`${getCollectivePageRoute(Collective)}/transactions`, undefined, { shallow: true });
    }
  }

  componentDidUpdate(oldProps) {
    // We store the component in state and update only if the next one is not
    // null because of a bug in Apollo where it strips the `Collective` from data
    // during re-hydratation.
    // See https://github.com/opencollective/opencollective/issues/1872
    const currentCollective = get(this.props, 'data.account');
    if (currentCollective && get(oldProps, 'data.account') !== currentCollective) {
      this.setState({ Collective: currentCollective });
    }

    const hasChildren =
      (this.props.data?.transactions?.nodes || []).some(
        el =>
          el.fromAccount?.parent?.id === currentCollective.id ||
          el.toAccount?.parent?.id === this.props.data?.account?.id,
      ) || this.props.query.ignoreChildrenTransactions;
    if (isNil(this.state.hasChildren) && hasChildren) {
      this.setState({ hasChildren });
    }

    const hasGiftCards =
      (this.props.data?.transactions?.nodes || []).some(
        el => el.giftCardEmitterAccount?.id && el.giftCardEmitterAccount?.id === this.props.data?.account?.id,
      ) || this.props.query.ignoreGiftCardsTransactions;
    if (isNil(this.state.hasGiftCards) && hasGiftCards) {
      this.setState({ hasGiftCards });
    }

    const hasIncognito =
      (this.props.data?.transactions?.nodes || []).some(el => el.account?.isIncognito) ||
      this.props.query.ignoreIncognitoTransactions;
    if (isNil(this.state.hasIncognito) && hasIncognito) {
      this.setState({ hasIncognito });
    }

    // Refetch to get permissions with the currently logged in user
    if (!oldProps.LoggedInUser && this.props.LoggedInUser) {
      this.props.data?.refetch();
    }
  }

  canDownloadInvoices() {
    const { LoggedInUser } = this.props;
    const collective = get(this.props, 'data.account') || this.state.Collective;
    if (!collective || !LoggedInUser) {
      return false;
    } else if (collective.type !== 'ORGANIZATION' && collective.type !== 'USER') {
      return false;
    } else {
      return (
        LoggedInUser.isHostAdmin(collective) ||
        LoggedInUser.canEditCollective(collective) ||
        LoggedInUser.hasRole(roles.ACCOUNTANT, collective) ||
        LoggedInUser.hasRole(roles.ACCOUNTANT, collective.host)
      );
    }
  }

  updateFilters(queryParams) {
    return this.props.router.push({
      pathname: `/${this.props.slug}/transactions`,
      query: omitBy({ ...this.props.query, ...queryParams }, value => !value),
    });
  }

  render() {
    const { LoggedInUser, query, data, slug } = this.props;
    const collective = get(this.props, 'data.account') || this.state.Collective;
    const { transactions, error, loading, variables, refetch } = data || {};
    const hasFilters = Object.entries(query).some(([key, value]) => {
      return !['view', 'offset', 'limit', 'slug'].includes(key) && value;
    });
    const canDownloadInvoices = this.canDownloadInvoices();

    if (!collective && data.loading) {
      return (
        <Page title="Transactions">
          <Loading />
        </Page>
      );
    } else if (!collective) {
      return <ErrorPage data={data} />;
    } else if (
      isSectionForAdminsOnly(collective, Sections.BUDGET) &&
      !LoggedInUser?.canEditCollective(collective) &&
      !LoggedInUser?.isHostAdmin(collective)
    ) {
      // Hack for funds that want to keep their budget "private"
      return <PageFeatureNotSupported showContactSupportLink={false} />;
    }

    return (
      <TransactionPageWrapper>
        <Header
          collective={collective}
          LoggedInUser={LoggedInUser}
          canonicalURL={getCanonicalURL(collective)}
          noRobots={['USER', 'INDIVIDUAL'].includes(collective.type) && !collective.isHost}
        />
        <Body>
          <CollectiveNavbar
            collective={collective}
            isAdmin={LoggedInUser && LoggedInUser.canEditCollective(collective)}
            selectedCategory={NAVBAR_CATEGORIES.BUDGET}
            selectedSection={collective.type === CollectiveType.COLLECTIVE ? Sections.BUDGET : Sections.TRANSACTIONS}
          />
          <Box maxWidth={1260} m="0 auto" px={[2, 3, 4]} py={[0, 5]} mt={3} data-cy="transactions-page-content">
            <Flex justifyContent="space-between">
              <H1 fontSize="32px" lineHeight="40px" py={2} fontWeight="normal" display={['none', 'block']}>
                <FormattedMessage id="menu.transactions" defaultMessage="Transactions" />
              </H1>
              <Box p={2} flexGrow={[1, 0]}>
                <SearchBar
                  defaultValue={query.searchTerm}
                  onSubmit={searchTerm => this.updateFilters({ searchTerm, offset: null })}
                />
              </Box>
            </Flex>
            <StyledHr my="24px" mx="8px" borderWidth="0.5px" />

            <Flex
              mb={['8px', '23px']}
              mx="8px"
              justifyContent="space-between"
              flexDirection={['column', 'row']}
              alignItems={['stretch', 'flex-end']}
            >
              <TransactionsFilters
                filters={query}
                kinds={transactions?.kinds}
                collective={collective}
                onChange={queryParams => this.updateFilters({ ...queryParams, offset: null })}
              />
              <Flex>
                {canDownloadInvoices && (
                  <Box mr="8px">
                    <Link href={`/${collective.slug}/admin/payment-receipts`}>
                      <StyledButton buttonSize="small" minWidth={140} isBorderless flexGrow={1}>
                        <FormattedMessage id="transactions.downloadinvoicesbutton" defaultMessage="Download Receipts" />
                        <IconDownload size="13px" style={{ marginLeft: '8px' }} />
                      </StyledButton>
                    </Link>
                  </Box>
                )}
                <TransactionsDownloadCSV collective={collective} query={this.props.query} />
              </Flex>
            </Flex>

            <Flex
              mb={['8px', '23px']}
              mx="8px"
              justifyContent="space-between"
              flexDirection={['column', 'row']}
              alignItems={['stretch', 'flex-end']}
            >
              {this.state.hasChildren && (
                <StyledCheckbox
                  checked={this.props.query.ignoreChildrenTransactions ? true : false}
                  onChange={({ checked }) => this.updateFilters({ ignoreChildrenTransactions: checked })}
                  label={
                    <FormattedMessage
                      id="transactions.excludeChildren"
                      defaultMessage="Exclude transactions from Projects and Events"
                    />
                  }
                />
              )}
              {this.state.hasGiftCards && (
                <StyledCheckbox
                  checked={this.props.query.ignoreGiftCardsTransactions ? true : false}
                  onChange={({ checked }) => this.updateFilters({ ignoreGiftCardsTransactions: checked })}
                  label={
                    <FormattedMessage
                      id="transactions.excludeGiftCards"
                      defaultMessage="Exclude Gift Card transactions"
                    />
                  }
                />
              )}
              {this.state.hasIncognito && (
                <StyledCheckbox
                  checked={this.props.query.ignoreIncognitoTransactions ? true : false}
                  onChange={({ checked }) => this.updateFilters({ ignoreIncognitoTransactions: checked })}
                  label={
                    <FormattedMessage
                      id="transactions.excludeIncognito"
                      defaultMessage="Exclude Incognito transactions"
                    />
                  }
                />
              )}
            </Flex>

            {error ? (
              <MessageBox type="error" withIcon>
                {getErrorFromGraphqlException(error).message}
              </MessageBox>
            ) : !loading && !transactions?.nodes?.length ? (
              <MessageBox type="info" withIcon data-cy="zero-transactions-message">
                {hasFilters ? (
                  <FormattedMessage
                    id="TransactionsList.Empty"
                    defaultMessage="No transactions found. <ResetLink>Reset filters</ResetLink> to see all transactions."
                    values={{
                      ResetLink(text) {
                        return (
                          <Link data-cy="reset-transactions-filters" href={`/${collective.slug}/transactions`}>
                            <span>{text}</span>
                          </Link>
                        );
                      },
                    }}
                  />
                ) : (
                  <FormattedMessage id="transactions.empty" defaultMessage="No transactions" />
                )}
              </MessageBox>
            ) : (
              <React.Fragment>
                <TransactionsList
                  isLoading={loading}
                  collective={collective}
                  nbPlaceholders={variables.limit}
                  transactions={transactions?.nodes}
                  displayActions
                  onMutationSuccess={() => refetch()}
                />
                <Flex mt={5} justifyContent="center">
                  <Pagination
                    route={`/${slug}/transactions`}
                    total={transactions?.totalCount}
                    limit={variables.limit}
                    offset={variables.offset}
                    ignoredQueryParams={['collectiveSlug']}
                    scrollToTopOnChange
                  />
                </Flex>
              </React.Fragment>
            )}
          </Box>
        </Body>
        <Footer />
      </TransactionPageWrapper>
    );
  }
}

const addTransactionsData = graphql(transactionsPageQuery, {
  options: props => {
    return {
      variables: { slug: props.slug, ...getVariablesFromQuery(props.query) },
      context: API_V2_CONTEXT,
    };
  },
});

export default withUser(addTransactionsData(withRouter(TransactionsPage)));
