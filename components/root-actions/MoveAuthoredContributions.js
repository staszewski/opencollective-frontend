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
import LinkCollective from '../LinkCollective';
import MessageBox from '../MessageBox';
import MessageBoxGraphqlError from '../MessageBoxGraphqlError';
import StyledButton from '../StyledButton';
import StyledCheckbox from '../StyledCheckbox';
import StyledInputField from '../StyledInputField';
import StyledLink from '../StyledLink';
import StyledSelect from '../StyledSelect';
import StyledTag from '../StyledTag';
import { Label, P, Span } from '../Text';
import { TOAST_TYPE, useToasts } from '../ToastProvider';

const moveOrdersFieldsFragment = gqlV2/* GraphQL */ `
  fragment MoveOrdersFields on Order {
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
`;

const ordersQuery = gqlV2/* GraphQL */ `
  query AuthoredOrdersRootQuery($account: AccountReferenceInput!) {
    orders(account: $account, filter: OUTGOING, limit: 100, includeIncognito: true) {
      nodes {
        ...MoveOrdersFields
      }
    }
  }
  ${moveOrdersFieldsFragment}
`;

const moveOrdersMutation = gqlV2/* GraphQL */ `
  mutation MoveOrdersMutation(
    $orders: [OrderReferenceInput!]!
    $fromAccount: AccountReferenceInput!
    $makeIncognito: Boolean
  ) {
    moveOrders(orders: $orders, fromAccount: $fromAccount, makeIncognito: $makeIncognito) {
      ...MoveOrdersFields
    }
  }
  ${moveOrdersFieldsFragment}
`;

const getOrdersOptionsFromData = (intl, data) => {
  if (!data?.orders) {
    return [];
  }

  return data.orders.nodes.map(order => {
    const date = intl.formatDate(order.createdAt);
    const amount = formatCurrency(order.amount.valueInCents, order.amount.currency, { locale: intl.locale });
    return {
      value: order,
      label: `${date} - ${amount} contribution to @${order.toAccount.slug} (#${order.legacyId})`,
    };
  });
};

const getCallToAction = (selectedOrdersOptions, newFromAccount) => {
  if (newFromAccount?.isIncognito) {
    return `Mark ${selectedOrdersOptions.length} contributions as incognito`;
  } else {
    const base = `Move ${selectedOrdersOptions.length} contributions`;
    return !newFromAccount ? base : `${base} to @${newFromAccount.slug}`;
  }
};

const getToAccountCustomOptions = fromAccount => {
  if (!fromAccount) {
    return [];
  }

  const incognitoLabel = `@${fromAccount.slug}'s incognito profile`;
  return [
    {
      [FLAG_COLLECTIVE_PICKER_COLLECTIVE]: true,
      value: fromAccount,
    },
    {
      [FLAG_COLLECTIVE_PICKER_COLLECTIVE]: true,
      label: incognitoLabel,
      value: { name: incognitoLabel, useIncognitoProfile: true, isIncognito: true },
    },
  ];
};

const formatOrderOption = (option, intl) => {
  const order = option.value;
  return (
    <Flex alignItems="center" title={order.description}>
      <Avatar collective={order.fromAccount} size={24} />
      <StyledTag fontSize="10px" mx={2} minWidth={75}>
        {intl.formatDate(order.createdAt)}
      </StyledTag>
      <Span fontSize="13px">
        {formatCurrency(order.amount.valueInCents, order.amount.currency, { locale: intl.locale })} contribution to @
        {order.toAccount.slug} (#{order.legacyId})
      </Span>
    </Flex>
  );
};

const getOrdersQueryOptions = selectedProfile => {
  return {
    skip: !selectedProfile,
    context: API_V2_CONTEXT,
    variables: selectedProfile ? { account: { legacyId: selectedProfile.id } } : null,
    fetchPolicy: 'network-only',
  };
};

const MoveAuthoredContributions = () => {
  // Local state and hooks
  const intl = useIntl();
  const { addToast } = useToasts();
  const [fromAccount, setFromAccount] = React.useState(null);
  const [newFromAccount, setNewFromAccount] = React.useState(null);
  const [hasConfirmationModal, setHasConfirmationModal] = React.useState(false);
  const [hasConfirmed, setHasConfirmed] = React.useState(false);
  const [selectedOrdersOptions, setSelectedOrderOptions] = React.useState([]);
  const isValid = Boolean(fromAccount && newFromAccount && selectedOrdersOptions.length);
  const callToAction = getCallToAction(selectedOrdersOptions, newFromAccount);
  const toAccountCustomOptions = React.useMemo(() => getToAccountCustomOptions(fromAccount), [fromAccount]);
  const hasConfirmCheckbox = !newFromAccount?.useIncognitoProfile;

  // GraphQL
  const { data, loading, error: ordersQueryError } = useQuery(ordersQuery, getOrdersQueryOptions(fromAccount));
  const allOptions = React.useMemo(() => getOrdersOptionsFromData(intl, data), [intl, data]);
  const mutationOptions = { context: API_V2_CONTEXT };
  const [submitMoveContributions] = useMutation(moveOrdersMutation, mutationOptions);
  const moveContributions = async () => {
    try {
      // Prepare variables
      const ordersInputs = selectedOrdersOptions.map(({ value }) => ({ id: value.id }));
      const mutationVariables = { orders: ordersInputs };
      if (newFromAccount.useIncognitoProfile) {
        mutationVariables.fromAccount = { legacyId: fromAccount.id };
        mutationVariables.makeIncognito = true;
      } else {
        mutationVariables.fromAccount = { legacyId: newFromAccount.id };
      }

      // Submit
      await submitMoveContributions({ variables: mutationVariables });
      addToast({ type: TOAST_TYPE.SUCCESS, title: 'Contributions moved successfully', message: callToAction });

      // Reset form and purge cache
      setHasConfirmationModal(false);
      setFromAccount(null);
      setNewFromAccount(null);
      setSelectedOrderOptions([]);
    } catch (e) {
      addToast({ type: TOAST_TYPE.ERROR, message: i18nGraphqlException(intl, e) });
    }
  };

  if (ordersQueryError) {
    return <MessageBoxGraphqlError error={ordersQueryError} />;
  }

  return (
    <div>
      <StyledInputField htmlFor="fromAccount" label="Account that authored the contribution" flex="1 1">
        {({ id }) => (
          <CollectivePickerAsync
            inputId={id}
            collective={fromAccount}
            isClearable
            onChange={option => {
              setFromAccount(option?.value || null);
              setSelectedOrderOptions([]);
              setNewFromAccount(null);
            }}
          />
        )}
      </StyledInputField>

      <Box mt={3}>
        <Flex justifyContent="space-between" alignItems="center" mb={1}>
          <Label fontWeight="normal" htmlFor="contributions">
            Select contributions
          </Label>
          <StyledButton
            buttonSize="tiny"
            buttonStyle="secondary"
            isBorderless
            onClick={() => setSelectedOrderOptions(allOptions)}
            disabled={!fromAccount}
          >
            Select all
          </StyledButton>
        </Flex>
        <StyledSelect
          isLoading={loading}
          options={allOptions}
          value={selectedOrdersOptions}
          inputId="contributions"
          onChange={options => setSelectedOrderOptions(options)}
          isClearable
          isMulti
          closeMenuOnSelect={false}
          disabled={!fromAccount}
          truncationThreshold={5}
          formatOptionLabel={option => formatOrderOption(option, intl)}
        />
      </Box>

      <StyledInputField htmlFor="toAccount" label="Move to" flex="1 1" mt={3}>
        {({ id }) => (
          <CollectivePickerAsync
            inputId={id}
            collective={newFromAccount}
            isClearable
            onChange={option => setNewFromAccount(option?.value || null)}
            disabled={!fromAccount}
            customOptions={toAccountCustomOptions}
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
          disableSubmit={hasConfirmCheckbox && !hasConfirmed}
          onClose={() => {
            setHasConfirmationModal(false);
            setHasConfirmed(false);
          }}
        >
          <P fontSize="14px" lineHeight="18px">
            You&apos;re about to move the following contributions from{' '}
            <StyledLink as={LinkCollective} collective={fromAccount} openInNewTab /> to{' '}
            <StyledLink as={LinkCollective} collective={newFromAccount} openInNewTab />. Are you sure you want to
            proceed?
          </P>
          <Container maxHeight={300} overflowY="auto" border="1px solid lightgrey" borderRadius="8px" mt={3}>
            {selectedOrdersOptions.map((option, index) => (
              <Container
                key={option.value.id}
                title={option.value.description}
                borderTop={!index ? undefined : '1px solid lightgrey'}
                p={2}
              >
                {formatOrderOption(option, intl)}
              </Container>
            ))}
          </Container>
          {/** We don't need to display this warning when moving to the incognito profile, as it stays under the same account */}
          {hasConfirmCheckbox && (
            <MessageBox type="warning" mt={3}>
              <StyledCheckbox
                checked={hasConfirmed}
                onChange={({ checked }) => setHasConfirmed(checked)}
                label={
                  <Span>
                    <strong>Warning</strong>: I understand that the payment methods used for the contributions will be
                    re-affected to the new profile, which must have the permission to use them.
                  </Span>
                }
              />
            </MessageBox>
          )}
        </ConfirmationModal>
      )}
    </div>
  );
};

MoveAuthoredContributions.propTypes = {};

export default MoveAuthoredContributions;
