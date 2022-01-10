import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useIntl } from 'react-intl';

import { formatCurrency } from '../../lib/currency-utils';
import { i18nGraphqlException } from '../../lib/errors';
import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';

import Avatar from '../Avatar';
import { FLAG_COLLECTIVE_PICKER_COLLECTIVE } from '../CollectivePicker';
import CollectivePickerAsync from '../CollectivePickerAsync';
import ConfirmationModal from '../ConfirmationModal';
import Container from '../Container';
import { Box, Flex } from '../Grid';
import Link from '../Link';
import LinkCollective from '../LinkCollective';
import MessageBox from '../MessageBox';
import MessageBoxGraphqlError from '../MessageBoxGraphqlError';
import OrdersPickerAsync from '../OrdersPickerAsync';
import StyledButton from '../StyledButton';
import StyledCheckbox from '../StyledCheckbox';
import StyledInputField from '../StyledInputField';
import StyledLink from '../StyledLink';
import StyledSelect from '../StyledSelect';
import StyledTag from '../StyledTag';
import { Label, P, Span } from '../Text';
import { TOAST_TYPE, useToasts } from '../ToastProvider';

const moveOrdersMutation = gqlV2/* GraphQL */ `
  mutation MoveOrdersMutation(
    $orders: [OrderReferenceInput!]!
    $receiverAccount: AccountReferenceInput!
    $makeIncognito: Boolean
  ) {
    moveOrders(orders: $orders, receiverAccount: $receiverAccount, makeIncognito: $makeIncognito) {
      id
      legacyId
      description
      createdAt
      amount {
        valueInCents
        currency
      }
      fromAccount {
        id
        name
        slug
        isIncognito
        imageUrl(height: 48)
      }
      toAccount {
        id
        slug
        name
      }
    }
  }
`;

const accountTiersQuery = gqlV2/* GraphQL */ `
  query MoveContributionsTiersQuery($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      settings
      ... on AccountWithContributions {
        tiers {
          nodes {
            id
            legacyId
            slug
            name
          }
        }
      }
    }
  }
`;

const getCallToAction = (selectedOrdersOptions, newTier) => {
  const base = `Move ${selectedOrdersOptions.length} contributions`;
  if (newTier === 'custom') {
    return `${base} to the "custom contribution" tier`;
  } else {
    return !newTier ? base : `${base} to "${newTier.name}" (#${newTier.legacyId})`;
  }
};

const getTiersOptions = (tiers, accountSettings) => {
  if (!tiers) {
    return [];
  }

  const tiersOptions = tiers.map(tier => ({ value: tier, label: `#${tier.legacyId} - ${tier.name}` }));
  if (!accountSettings?.disableCustomContributions) {
    tiersOptions.unshift({ value: 'custom', label: 'Custom contribution' });
  }

  return tiersOptions;
};

const MoveReceivedContributions = () => {
  // Local state and hooks
  const intl = useIntl();
  const { addToast } = useToasts();
  const [receiverAccount, setReceiverAccount] = React.useState(null);
  const [hasConfirmationModal, setHasConfirmationModal] = React.useState(false);
  const [selectedOrdersOptions, setSelectedOrderOptions] = React.useState([]);
  const [newTier, setNewTier] = React.useState(false);
  const isValid = Boolean(receiverAccount && selectedOrdersOptions.length && newTier);
  const callToAction = getCallToAction(selectedOrdersOptions, newTier);

  // Fetch tiers
  const tiersQueryVariables = { accountSlug: receiverAccount?.slug };
  const tiersQueryOptions = { skip: !receiverAccount, variables: tiersQueryVariables, context: API_V2_CONTEXT };
  const { data: tiersData, loading: tiersLoading } = useQuery(accountTiersQuery, tiersQueryOptions);
  const tiersNodes = tiersData?.account.tiers?.nodes;
  const accountSettings = tiersData?.account.settings;
  const tiersOptions = React.useMemo(() => getTiersOptions(tiersNodes, accountSettings), [tiersNodes, accountSettings]);

  // Move contributions mutation
  const mutationOptions = { context: API_V2_CONTEXT };
  const [submitMoveContributions] = useMutation(moveOrdersMutation, mutationOptions);
  const moveContributions = async () => {
    // try {
    //   // Prepare variables
    //   const ordersInputs = selectedOrdersOptions.map(({ value }) => ({ id: value.id }));
    //   const mutationVariables = { orders: ordersInputs };
    //   if (newFromAccount.useIncognitoProfile) {
    //     mutationVariables.receiverAccount = { legacyId: receiverAccount.id };
    //     mutationVariables.makeIncognito = true;
    //   } else {
    //     mutationVariables.receiverAccount = { legacyId: newFromAccount.id };
    //   }
    //   // Submit
    //   await submitMoveContributions({ variables: mutationVariables });
    //   addToast({ type: TOAST_TYPE.SUCCESS, title: 'Contributions moved successfully', message: callToAction });
    //   // Reset form and purge cache
    //   setHasConfirmationModal(false);
    //   setReceiverAccount(null);
    //   setNewFromAccount(null);
    //   setSelectedOrderOptions([]);
    // } catch (e) {
    //   addToast({ type: TOAST_TYPE.ERROR, message: i18nGraphqlException(intl, e) });
    // }
  };

  // if (ordersQueryError) {
  //   return <MessageBoxGraphqlError error={ordersQueryError} />;
  // }

  return (
    <div>
      <StyledInputField htmlFor="receiverAccount" label="Account that received the contributions" flex="1 1">
        {({ id }) => (
          <CollectivePickerAsync
            inputId={id}
            collective={receiverAccount}
            isClearable
            onChange={option => {
              setReceiverAccount(option?.value || null);
              setSelectedOrderOptions([]);
              setNewTier(null);
            }}
          />
        )}
      </StyledInputField>

      <StyledInputField htmlFor="contributions" label="Select contributions" flex="1 1" mt={3}>
        {({ id }) => (
          <OrdersPickerAsync
            value={selectedOrdersOptions}
            inputId={id}
            onChange={options => setSelectedOrderOptions(options)}
            disabled={!receiverAccount}
            closeMenuOnSelect={false}
            account={receiverAccount}
            filter="INCOMING"
            includeIncognito
            isMulti
            isClearable
          />
        )}
      </StyledInputField>

      <StyledInputField htmlFor="tier" label="Select destination tier" flex="1 1" mt={3}>
        {({ id }) => (
          <StyledSelect
            inputId={id}
            disabled={!tiersData}
            isLoading={tiersLoading}
            onChange={({ value }) => setNewTier(value)}
            options={tiersOptions}
          />
        )}
      </StyledInputField>

      <StyledButton
        mt={4}
        width="100%"
        buttonStyle="primary"
        disabled={!isValid}
        onClick={() => setHasConfirmationModal(true)}
      >
        {callToAction}
      </StyledButton>

      {hasConfirmationModal && (
        <ConfirmationModal
          show
          header={callToAction}
          continueHandler={moveContributions}
          onClose={() => setHasConfirmationModal(false)}
        >
          <P>
            You&apos;re about to move {selectedOrdersOptions.length} orders to{' '}
            {newTier === 'custom' ? (
              'the custom contribution tier'
            ) : (
              <StyledLink
                as={Link}
                href={`/${receiverAccount.slug}/contribute/${newTier.slug}-${newTier.legacyId}`}
                openInNewTab
              >
                {newTier.name} (#{newTier.legacyId})
              </StyledLink>
            )}
            .
          </P>
          <Container maxHeight={300} overflowY="auto" border="1px solid lightgrey" borderRadius="8px" mt={3}>
            {selectedOrdersOptions.map(({ value: order }, index) => (
              <Container
                key={order.id}
                title={order.description}
                borderTop={!index ? undefined : '1px solid lightgrey'}
                p={2}
              >
                <Flex alignItems="center" title={order.description}>
                  <Avatar collective={order.receiverAccount} size={24} />
                  <StyledTag fontSize="10px" mx={2} minWidth={75}>
                    #{order.legacyId}
                  </StyledTag>
                  <Flex flexDirection="column">
                    <Span fontSize="13px">
                      {intl.formatDate(order.createdAt)}
                      {' - '}
                      {formatCurrency(order.amount.valueInCents, order.amount.currency, {
                        locale: intl.locale,
                      })}{' '}
                      contribution to @{order.toAccount.slug}
                    </Span>
                    <Span fontSize="13px">
                      Current tier:{' '}
                      {order.tier ? (
                        <StyledLink
                          as={Link}
                          href={`/${order.toAccount.slug}/contribute/${order.tier.slug}-${order.tier.legacyId}`}
                          openInNewTab
                        >
                          {order.tier.name}
                        </StyledLink>
                      ) : (
                        'Custom contribution'
                      )}
                    </Span>
                  </Flex>
                </Flex>
              </Container>
            ))}
          </Container>
        </ConfirmationModal>
      )}
    </div>
  );
};

MoveReceivedContributions.propTypes = {};

export default MoveReceivedContributions;
