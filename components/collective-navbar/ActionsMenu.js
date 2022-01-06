import React from 'react';
import PropTypes from 'prop-types';
import { Envelope } from '@styled-icons/boxicons-regular/Envelope';
import { Planet } from '@styled-icons/boxicons-regular/Planet';
import { Receipt } from '@styled-icons/boxicons-regular/Receipt';
import { CreditCard } from '@styled-icons/fa-solid/CreditCard';
import { MoneyCheckAlt } from '@styled-icons/fa-solid/MoneyCheckAlt';
import { ChevronDown } from '@styled-icons/feather/ChevronDown/ChevronDown';
import { AttachMoney } from '@styled-icons/material/AttachMoney';
import { Dashboard } from '@styled-icons/material/Dashboard';
import { Settings } from '@styled-icons/material/Settings';
import { Stack } from '@styled-icons/remix-line/Stack';
import { pickBy } from 'lodash';
import { useRouter } from 'next/router';
import { FormattedMessage } from 'react-intl';
import styled, { css } from 'styled-components';

import { getContributeRoute } from '../../lib/collective.lib';
import { getEnvVar } from '../../lib/env-utils';
import { getCollectivePageRoute, getSettingsRoute } from '../../lib/url-helpers';
import { parseToBoolean } from '../../lib/utils';

import ActionButton from '../ActionButton';
import AddFundsBtn from '../AddFundsBtn';
import ApplyToHostBtn from '../ApplyToHostBtn';
import AssignVirtualCardBtn from '../AssignVirtualCardBtn';
import ContactCollectiveModal from '../ContactCollectiveModal';
import Container from '../Container';
import CreateVirtualCardBtn from '../CreateVirtualCardBtn';
import { Box, Flex } from '../Grid';
import Link from '../Link';
import RequestVirtualCardBtn from '../RequestVirtualCardBtn';
import StyledButton from '../StyledButton';
import { Dropdown, DropdownArrow, DropdownContent } from '../StyledDropdown';
import StyledHr from '../StyledHr';
import StyledLink from '../StyledLink';
import { Span } from '../Text';

import { NAVBAR_ACTION_TYPE } from './menu';

//  Styled components
const MenuItem = styled('li')`
  display: flex;
  align-items: center;

  &,
  a,
  button {
    width: 100%;
    text-align: left;
    font-style: normal;
    font-weight: 500;
    font-size: 13px;
    line-height: 16px;
    letter-spacing: -0.4px;
    outline: none;

    @media (max-width: 40em) {
      font-size: 14px;
    }

    &:not(:hover) {
      color: #313233;
    }

    &:hover:not(:disabled) {
      background: white;
      color: ${props => props.theme.colors.black[800]};
      &:not(:active) {
        background: white;
        text-decoration: underline;
      }
    }

    &:focus {
      box-shadow: none;
      outline: none;
      background: white;
      text-shadow: 0px 0px 1px black; /** Using text-shadow rather than font-weight to prevent size changes */
    }

    &:disabled {
      color: #8c8c8c;
    }
  }

  a,
  button {
    &:not(:active) {
      margin-right: 24px;
    }

    &:active {
      outline: 1px solid #e8e9eb;
      margin-left: 12px;
      margin-right: 12px;
      background: white;
    }
  }

  svg {
    margin-right: 8px;
    fill: ${props => props.theme.colors.primary[600]};
    color: ${props => props.theme.colors.primary[600]};
  }

  ${props =>
    props.isHiddenOnMobile &&
    css`
      @media screen and (min-width: 40em) {
        display: none;
      }
    `}
`;

const ActionsDropdown = styled(Dropdown)`
  ${DropdownContent} {
    padding: 8px 0;
  }

  @media screen and (min-width: 40em) and (max-width: 88em) {
    ${DropdownContent} {
      right: 50px;
    }
  }

  @media (max-width: 40em) {
    ${DropdownArrow} {
      display: none !important;
    }
    ${DropdownContent} {
      display: block;
      position: relative;
      box-shadow: none;
      border: none;
      padding-top: 0;
      text-transform: uppercase;
      button {
        text-transform: uppercase;
      }

      svg {
        margin-right: 16px;
      }
    }
  }

  ${props =>
    props.$isHiddenOnNonMobile &&
    css`
      @media screen and (min-width: 40em) {
        display: none;
      }
    `}
`;

const StyledActionButton = styled(ActionButton).attrs({ isSecondary: true })`
  svg {
    stroke-width: 2;
  }

  span {
    vertical-align: middle;
    margin-right: 4px;
  }

  @media (max-width: 40em) {
    cursor: none;
    pointer-events: none;
  }
`;

const StyledChevronDown = styled(ChevronDown)`
  @media (max-width: 40em) {
    display: none;
  }
`;

const ITEM_PADDING = '11px 14px';

const CollectiveNavbarActionsMenu = ({ collective, callsToAction, hiddenActionForNonMobile, LoggedInUser }) => {
  const enabledCTAs = Object.keys(pickBy(callsToAction, Boolean));
  const isEmpty = enabledCTAs.length < 1;
  const hasOnlyOneHiddenCTA = enabledCTAs.length === 1 && hiddenActionForNonMobile === enabledCTAs[0];
  const hasNewAdminPanel = parseToBoolean(getEnvVar('NEW_ADMIN_DASHBOARD'));
  const [showContactModal, setShowContactModal] = React.useState(false);
  const router = useRouter();

  // Do not render the menu if there are no available CTAs
  if (isEmpty) {
    return null;
  }

  return (
    <Container
      display={hasOnlyOneHiddenCTA ? ['flex', 'none'] : 'flex'}
      alignItems="center"
      order={[-1, 0]}
      borderTop={['1px solid #e1e1e1', 'none']}
      ml={1}
    >
      <Box px={1}>
        <ActionsDropdown trigger="click" $isHiddenOnNonMobile={enabledCTAs.length <= 2}>
          {({ triggerProps, dropdownProps }) => (
            <React.Fragment>
              <Flex alignItems="center">
                <Box display={['block', 'none']} width={'32px'} ml={2}>
                  <StyledHr borderStyle="solid" borderColor="primary.600" />
                </Box>
                <StyledActionButton data-cy="collective-navbar-actions-btn" my={2} {...triggerProps}>
                  <Span>
                    <FormattedMessage id="CollectivePage.NavBar.ActionMenu.Actions" defaultMessage="Actions" />
                  </Span>
                  <StyledChevronDown size="14px" />
                </StyledActionButton>
              </Flex>
              <div {...dropdownProps}>
                <DropdownArrow />
                <DropdownContent>
                  <Box as="ul" p={0} m={0} minWidth={184}>
                    {callsToAction.hasSettings && (
                      <MenuItem py={1} isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.SETTINGS}>
                        <StyledLink
                          as={Link}
                          href={getSettingsRoute(collective, null, LoggedInUser)}
                          p={ITEM_PADDING}
                          data-cy="edit-collective-btn"
                        >
                          <Settings size={20} />
                          <FormattedMessage id="Settings" defaultMessage="Settings" />
                        </StyledLink>
                      </MenuItem>
                    )}
                    {callsToAction.hasDashboard && !hasNewAdminPanel && (
                      <MenuItem isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.DASHBOARD}>
                        <StyledLink as={Link} href={`/${collective.slug}/dashboard`}>
                          <Container p={ITEM_PADDING}>
                            <Dashboard size="20px" />
                            <FormattedMessage id="host.dashboard" defaultMessage="Dashboard" />
                          </Container>
                        </StyledLink>
                      </MenuItem>
                    )}
                    {callsToAction.hasSubmitExpense && (
                      <MenuItem isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.SUBMIT_EXPENSE}>
                        <StyledLink as={Link} href={`${getCollectivePageRoute(collective)}/expenses/new`}>
                          <Container p={ITEM_PADDING}>
                            <Receipt size="20px" />
                            <FormattedMessage id="ExpenseForm.Submit" defaultMessage="Submit expense" />
                          </Container>
                        </StyledLink>
                      </MenuItem>
                    )}
                    {callsToAction.hasRequestGrant && (
                      <MenuItem py={1} isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.REQUEST_GRANT}>
                        <StyledLink as={Link} href={`${getCollectivePageRoute(collective)}/expenses/new`}>
                          <Container p={ITEM_PADDING}>
                            <MoneyCheckAlt size="20px" />
                            <FormattedMessage id="ExpenseForm.Type.Request" defaultMessage="Request Grant" />
                          </Container>
                        </StyledLink>
                      </MenuItem>
                    )}
                    {callsToAction.hasManageSubscriptions && (
                      <MenuItem isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.MANAGE_SUBSCRIPTIONS}>
                        <StyledLink as={Link} href={`/${getCollectivePageRoute(collective)}/recurring-contributions`}>
                          <Container p={ITEM_PADDING}>
                            <Stack size="20px" />
                            <span>
                              <FormattedMessage id="menu.subscriptions" defaultMessage="Manage Contributions" />
                            </span>
                          </Container>
                        </StyledLink>
                      </MenuItem>
                    )}
                    {callsToAction.hasContribute && (
                      <MenuItem py={1} isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.CONTRIBUTE}>
                        <StyledLink as={Link} href={getContributeRoute(collective)}>
                          <Container p={ITEM_PADDING}>
                            <Planet size="20px" />
                            <FormattedMessage id="menu.contributeMoney" defaultMessage="Contribute Money" />
                          </Container>
                        </StyledLink>
                      </MenuItem>
                    )}
                    {callsToAction.addFunds && (
                      <AddFundsBtn collective={collective} host={collective.host}>
                        {btnProps => (
                          <MenuItem py={1} isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.ADD_FUNDS}>
                            <StyledButton
                              borderRadius={0}
                              p={ITEM_PADDING}
                              isBorderless
                              {...btnProps}
                              data-cy="add-funds-btn"
                            >
                              <AttachMoney size="20px" />
                              <Span>
                                <FormattedMessage id="menu.addFunds" defaultMessage="Add Funds" />
                              </Span>
                            </StyledButton>
                          </MenuItem>
                        )}
                      </AddFundsBtn>
                    )}
                    {callsToAction.hasContact && (
                      <MenuItem py={1} isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.CONTACT}>
                        <StyledButton
                          onClick={() =>
                            LoggedInUser ? setShowContactModal(true) : router.push(`/${collective.slug}/contact`)
                          }
                          borderRadius={0}
                          p={ITEM_PADDING}
                          isBorderless
                        >
                          <Envelope size="20px" />
                          <FormattedMessage id="Contact" defaultMessage="Contact" />
                        </StyledButton>
                      </MenuItem>
                    )}
                    {callsToAction.hasApply && (
                      <MenuItem py={1} isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.APPLY}>
                        <ApplyToHostBtn
                          hostSlug={collective.slug}
                          isHidden={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.APPLY}
                          buttonProps={{ isBorderless: true, p: ITEM_PADDING }}
                        />
                      </MenuItem>
                    )}
                    {callsToAction.createVirtualCard && (
                      <CreateVirtualCardBtn collective={collective} host={collective.host}>
                        {btnProps => (
                          <MenuItem
                            py={1}
                            isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.CREATE_CARD}
                          >
                            <StyledButton borderRadius={0} p={ITEM_PADDING} isBorderless {...btnProps}>
                              <CreditCard size="20px" />
                              <Span>
                                <FormattedMessage defaultMessage="Create a Card" />
                              </Span>
                            </StyledButton>
                          </MenuItem>
                        )}
                      </CreateVirtualCardBtn>
                    )}
                    {callsToAction.assignVirtualCard && (
                      <AssignVirtualCardBtn collective={collective} host={collective.host}>
                        {btnProps => (
                          <MenuItem
                            py={1}
                            isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.ASSIGN_CARD}
                          >
                            <StyledButton borderRadius={0} p={ITEM_PADDING} isBorderless {...btnProps}>
                              <CreditCard size="20px" />
                              <Span>
                                <FormattedMessage id="menu.assignCard" defaultMessage="Assign a Card" />
                              </Span>
                            </StyledButton>
                          </MenuItem>
                        )}
                      </AssignVirtualCardBtn>
                    )}
                    {callsToAction.requestVirtualCard && (
                      <RequestVirtualCardBtn collective={collective} host={collective.host}>
                        {btnProps => (
                          <MenuItem
                            py={1}
                            isHiddenOnMobile={hiddenActionForNonMobile === NAVBAR_ACTION_TYPE.ASSIGN_CARD}
                          >
                            <StyledButton borderRadius={0} p={ITEM_PADDING} isBorderless {...btnProps}>
                              <CreditCard size="20px" />
                              <Span>
                                <FormattedMessage
                                  id="Collective.VirtualCards.RequestCard"
                                  defaultMessage="Request a Card"
                                />
                              </Span>
                            </StyledButton>
                          </MenuItem>
                        )}
                      </RequestVirtualCardBtn>
                    )}
                  </Box>
                </DropdownContent>
              </div>
            </React.Fragment>
          )}
        </ActionsDropdown>
      </Box>
      <ContactCollectiveModal
        show={showContactModal}
        collective={collective}
        onClose={() => setShowContactModal(false)}
      />
    </Container>
  );
};

CollectiveNavbarActionsMenu.propTypes = {
  collective: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    legacyId: PropTypes.number,
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    type: PropTypes.string,
    settings: PropTypes.object,
    tiers: PropTypes.array,
    host: PropTypes.shape({
      hostFees: PropTypes.bool,
    }),
  }),
  callsToAction: PropTypes.shape({
    /** Button to contact the collective */
    hasContact: PropTypes.bool,
    /** Submit new expense button */
    hasSubmitExpense: PropTypes.bool,
    /** Host's "Apply" button */
    hasApply: PropTypes.bool,
    /** Host's dashboard */
    hasDashboard: PropTypes.bool,
    /** Manage recurring contributions */
    hasManageSubscriptions: PropTypes.bool,
    /** Request a grant from a fund */
    hasRequestGrant: PropTypes.bool,
    /** Contribute financially to a collective */
    hasContribute: PropTypes.bool,
    /** Add funds to a collective */
    addFunds: PropTypes.bool,
    /** Create new card for Collective */
    createVirtualCard: PropTypes.bool,
    /** Assign card to Collective */
    assignVirtualCard: PropTypes.bool,
    /** Request card to Collective */
    requestVirtualCard: PropTypes.bool,
    /** Button to Edit the Collective */
    hasSettings: PropTypes.bool,
  }).isRequired,
  hiddenActionForNonMobile: PropTypes.oneOf(Object.values(NAVBAR_ACTION_TYPE)),
  LoggedInUser: PropTypes.object,
};

CollectiveNavbarActionsMenu.defaultProps = {
  callsToAction: {},
  buttonsMinWidth: 100,
};

export default CollectiveNavbarActionsMenu;
