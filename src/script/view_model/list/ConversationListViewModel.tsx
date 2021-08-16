/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import React from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import type {Availability} from '@wireapp/protocol-messaging';
import type {WebappProperties} from '@wireapp/api-client/src/user/data/';
import type {MouseEventHandler} from 'react';

import 'Components/AvailabilityState';
import 'Components/LegalHoldDot';
import 'Components/list/groupedConversations';
import {AVATAR_SIZE} from 'Components/Avatar';
import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';

import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import {ContentViewModel} from '../ContentViewModel';
import {ConversationState} from '../../conversation/ConversationState';
import {generateConversationUrl} from '../../router/routeGenerator';
import {ListViewModel} from '../ListViewModel';
import {NOTIFICATION_HANDLING_STATE} from '../../event/NotificationHandlingState';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {CallingViewModel} from '../CallingViewModel';
import type {Conversation} from '../../entity/Conversation';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {EventRepository} from '../../event/EventRepository';
import type {MainViewModel} from '../MainViewModel';
import type {PreferenceNotificationRepository} from '../../notification/PreferenceNotificationRepository';
import type {PropertiesRepository} from '../../properties/PropertiesRepository';
import type {User} from '../../entity/User';
import {createNavigate} from '../../router/routerBindings';
import ConversationListCallingCell from 'Components/list/ConversationListCallingCell';
import LegalHoldDot from 'Components/LegalHoldDot';
import AvailabilityState from 'Components/AvailabilityState';
import {Avatar} from '@wireapp/react-ui-kit';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import ConversationListCell from 'Components/list/ConversationListCell';

export interface ConversationListProps {
  callingRepository: CallingRepository;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  eventRepository: EventRepository;
  listViewModel: ListViewModel;
  mainViewModel: MainViewModel;
  onJoinCall: Function;
  preferenceNotificationRepository: PreferenceNotificationRepository;
  propertiesRepository: PropertiesRepository;
  teamState?: TeamState;
  userState?: UserState;
}

const ConversationList: React.FC<ConversationListProps> = ({
  mainViewModel,
  listViewModel,
  onJoinCall,
  eventRepository,
  callingRepository,
  conversationRepository,
  preferenceNotificationRepository,
  propertiesRepository,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
  conversationState = container.resolve(ConversationState),
}) => {
  return (
    <>
      <div id="conversations" className="conversations left-list-is-visible" data-bind="with: $root.conversations">
        <div className="left-list-header">
          <settings-icon
            className="conversations-settings button-icon-large accent-text"
            data-bind="clickOrDrag: clickOnPreferencesButton, attr: {title: t('tooltipConversationsPreferences')}, css: {'conversations-settings--badge': showBadge()}"
            data-uie-name="go-preferences"
          ></settings-icon>
          {/* <!-- ko if: isTeam() --> */}
          <AvailabilityState
            className="left-list-header-availability"
            data-bind="clickOrDrag: clickOnAvailability"
            params="availability: selfAvailability, label: selfUserName, dataUieName: 'status-availability'"
          />
          {/* <!-- ko if: isOnLegalHold() || hasPendingLegalHold() --> */}
          <LegalHoldDot
            style="padding: 8px;"
            params="legalHoldModal: contentViewModel.legalHoldModal, isPending: hasPendingLegalHold()"
            data-bind="attr: {'data-uie-name': hasPendingLegalHold() ? 'status-legal-hold-pending' : 'status-legal-hold'}"
          />
          {/* <!-- /ko --> */}
          {/* <!-- /ko --> */}
          {/* <!-- ko ifnot: isTeam() --> */}
          <span className="left-list-header-text" data-bind="text: selfUserName" data-uie-name="status-name"></span>
          {/* <!-- /ko --> */}
        </div>
        {/* <!-- ko using: callingViewModel --> */}
        {/* <!-- ko foreach: {data: activeCalls, as: 'activeCall', noChildContext: true} --> */}
        {/* <!-- ko if: !activeCall.reason() --> */}
        <ConversationListCallingCell
          data-bind="attr: {'data-uie-uid': $data.id, 'data-uie-value': getConversationById(activeCall.conversationId).display_name}"
          params="
              call: activeCall,
              conversation: getConversationById(activeCall.conversationId),
              multitasking: multitasking,
              callingRepository: callingRepository,
              callActions: callActions,
              hasAccessToCamera: hasAccessToCamera(),
              isSelfVerified: isSelfVerified"
          data-uie-name="item-call"
        />
        {/* <!-- /ko --> */}
        {/* <!-- /ko --> */}
        {/* <!-- /ko --> */}
        <div className="left-list-center">
          {/* <!-- ko if: unarchivedConversations().length > 0 || showConnectRequests() --> */}
          <ul
            className="left-list-items conversation-list"
            data-bind="antiscroll: shouldUpdateScrollbar, bordered_list: unarchivedConversations"
          >
            {/* <!-- ko if: showConnectRequests() --> */}
            <li
              className="conversation-list-cell"
              data-bind="click: clickOnConnectRequests, css: {'conversation-list-cell-active': stateIsRequests()}"
            >
              <div className="conversation-list-cell-left">
                {/* <!-- ko if: connectRequests().length === 1 --> */}
                <div className="avatar-halo">
                  <Avatar params="participant: connectRequests()[0], size: participantAvatarSize" />
                </div>
                {/* <!-- /ko --> */}

                {/* <!-- ko if: connectRequests().length > 1 --> */}
                <GroupAvatar params="users: connectRequests()" />
                {/* <!-- /ko --> */}
              </div>

              <div className="conversation-list-cell-center">
                <span
                  className="conversation-list-cell-name"
                  data-bind="text: connectRequestsText, css: {'accent-text': stateIsRequests()}"
                  data-uie-name="item-pending-requests"
                ></span>
              </div>

              <div className="conversation-list-cell-right">
                <span
                  className="conversation-list-cell-badge cell-badge-dark icon-pending"
                  data-uie-name="status-pending"
                ></span>
              </div>
            </li>
            {/* <!-- /ko --> */}
            {/* <!-- ko let: {isVisibleFunc: getIsVisibleFunc()} --> */}
            <div data-uie-name="recent-view" data-bind="visible: showRecentConversations()">
              {/* <!-- ko foreach: {data: unarchivedConversations, as: 'conversation', noChildContext: true} --> */}
              <ConversationListCell
                data-uie-name="item-conversation"
                params="onClick: makeOnClick(conversation.id, conversation.domain), rightClick: (_, event) => listViewModel.onContextMenu(conversation, event), conversation: conversation, showJoinButton: hasJoinableCall(conversation.id), is_selected: isSelectedConversation, onJoinCall: onJoinCall, index: $index, isVisibleFunc: isVisibleFunc"
              />
              {/* <!-- /ko --> */}
            </div>
            <div data-uie-name="folder-view" data-bind="hidden: showRecentConversations()">
              <grouped-conversations
                params="
                conversationRepository: conversationRepository,
                listViewModel: listViewModel,
                hasJoinableCall: hasJoinableCall,
                onJoinCall: onJoinCall,
                isSelectedConversation: isSelectedConversation,
                expandedFolders: expandedFoldersIds,
                isVisibleFunc: isVisibleFunc"
              ></grouped-conversations>
            </div>
            {/* <!-- /ko --> */}
          </ul>
          {/* <!-- /ko --> */}
          {/* <!-- ko if: noConversations() --> */}
          {/* <!-- ko if: archivedConversations().length === 0 --> */}
          <div className="conversations-hint" data-uie-name="status-start-conversation-hint">
            <div className="conversations-hint-text" data-bind="text: t('conversationsNoConversations')"></div>
            <arrow-down-long-icon className="conversations-hint-arrow"></arrow-down-long-icon>
          </div>
          {/* <!-- /ko --> */}
          {/* <!-- ko if: archivedConversations().length > 0 --> */}
          <div className="conversations-all-archived" data-bind="text: t('conversationsAllArchived')"></div>
          {/* <!-- /ko --> */}
          {/* <!-- /ko --> */}
        </div>
        <div className="conversations-footer">
          <people-icon
            className="button-icon-large"
            data-bind="attr: {title: startTooltip}, click: clickOnPeopleButton"
            data-uie-name="go-people"
          ></people-icon>
          <conversations-recent-icon
            className="button-icon-large"
            data-uie-name="go-recent-view"
            data-bind="attr: {title: conversationsTooltip, 'data-uie-status': showRecentConversations() ? 'active' : 'inactive'}, css: {'accent-fill': showRecentConversations()}, click: () => showRecentConversations(true)"
          ></conversations-recent-icon>
          <conversations-folder-icon
            className="button-icon-large"
            data-uie-name="go-folder-view"
            data-bind="attr: {title: foldersTooltip, 'data-uie-status': showRecentConversations() ? 'inactive' : 'active'}, css: {'accent-fill': !showRecentConversations()}, click: () => showRecentConversations(false)"
          ></conversations-folder-icon>
          {/* <!-- ko if: archivedConversations().length > 0 --> */}
          <archive-icon
            className="button-icon-large"
            data-bind="attr: {title: archiveTooltip}, click: clickOnArchivedButton"
            data-uie-name="go-archive"
          ></archive-icon>
          {/* <!-- /ko --> */}
        </div>
      </div>
    </>
  );
};

export default ConversationList;

export class ConversationListViewModel2 {
  readonly startTooltip: string;
  readonly foldersTooltip: string;
  readonly conversationsTooltip: string;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly contentViewModel: ContentViewModel;
  readonly showBadge: ko.PureComputed<boolean>;
  readonly selfUserName: ko.PureComputed<string>;
  readonly isOnLegalHold: ko.PureComputed<boolean>;
  readonly archiveTooltip: ko.PureComputed<string>;
  readonly shouldUpdateScrollbar: ko.Computed<void>;
  readonly stateIsRequests: ko.PureComputed<boolean>;
  readonly noConversations: ko.PureComputed<boolean>;
  readonly connectRequestsText: ko.PureComputed<string>;
  readonly hasPendingLegalHold: ko.PureComputed<boolean>;
  readonly showConnectRequests: ko.PureComputed<boolean>;
  readonly selfAvailability: ko.PureComputed<Availability.Type>;
  readonly makeOnClick: (conversationId: string, domain: string | null) => MouseEventHandler<Element>;
  readonly participantAvatarSize: typeof AVATAR_SIZE.SMALL;
  readonly getIsVisibleFunc: () => (() => boolean) | ((top: number, bottom: number) => boolean);
  private readonly logger: Logger;
  private readonly selfUser: ko.PureComputed<User>;
  private readonly showCalls: ko.Observable<boolean>;
  private readonly callingViewModel: CallingViewModel;
  private readonly contentState: ko.Observable<string>;
  private readonly webappIsLoaded: ko.Observable<boolean>;
  private readonly connectRequests: ko.PureComputed<User[]>;
  private readonly isActivatedAccount: ko.PureComputed<boolean>;
  private readonly expandedFoldersIds: ko.ObservableArray<string>;
  private readonly showRecentConversations: ko.Observable<boolean>;
  private readonly archivedConversations: ko.ObservableArray<Conversation>;
  private readonly unarchivedConversations: ko.ObservableArray<Conversation>;

  constructor(
    mainViewModel: MainViewModel,
    readonly listViewModel: ListViewModel,
    readonly onJoinCall: Function,
    eventRepository: EventRepository,
    readonly callingRepository: CallingRepository,
    readonly conversationRepository: ConversationRepository,
    private readonly preferenceNotificationRepository: PreferenceNotificationRepository,
    private readonly propertiesRepository: PropertiesRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.participantAvatarSize = AVATAR_SIZE.SMALL;

    this.contentViewModel = mainViewModel.content;
    this.callingViewModel = mainViewModel.calling;

    this.logger = getLogger('ConversationListViewModel');

    this.showCalls = ko.observable();
    this.setShowCallsState(eventRepository.notificationHandlingState());
    eventRepository.notificationHandlingState.subscribe(this.setShowCallsState);

    this.contentState = this.contentViewModel.state;

    this.isOnLegalHold = ko.pureComputed(() => this.selfUser().isOnLegalHold());
    this.hasPendingLegalHold = ko.pureComputed(() => this.selfUser().hasPendingLegalHold());
    this.isTeam = this.teamState.isTeam;
    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.makeOnClick = (conversationId: string, domain: string | null) =>
      createNavigate(generateConversationUrl(conversationId, domain));

    this.selfUser = ko.pureComputed(() => this.userState.self && this.userState.self());
    this.selfAvailability = ko.pureComputed(() => this.selfUser() && this.selfUser().availability());
    this.selfUserName = ko.pureComputed(() => this.selfUser() && this.selfUser().name());

    this.connectRequests = this.userState.connectRequests;
    this.connectRequestsText = ko.pureComputed(() => {
      const reqCount = this.connectRequests().length;
      const hasMultipleRequests = reqCount > 1;
      return hasMultipleRequests
        ? t('conversationsConnectionRequestMany', reqCount)
        : t('conversationsConnectionRequestOne');
    });
    this.stateIsRequests = ko.pureComputed(() => {
      return this.contentState() === ContentViewModel.STATE.CONNECTION_REQUESTS;
    });

    this.archivedConversations = this.conversationState.conversations_archived;
    this.unarchivedConversations = this.conversationState.conversations_unarchived;

    this.noConversations = ko.pureComputed(() => {
      return !this.unarchivedConversations().length && !this.connectRequests().length;
    });

    this.webappIsLoaded = ko.observable(false);

    this.archiveTooltip = ko.pureComputed(() => {
      return t('tooltipConversationsArchived', this.archivedConversations().length);
    });

    const startShortcut = Shortcut.getShortcutTooltip(ShortcutType.START);
    this.startTooltip = t('tooltipConversationsStart', startShortcut);
    this.conversationsTooltip = t('conversationViewTooltip');
    this.foldersTooltip = t('folderViewTooltip');

    this.showConnectRequests = ko.pureComputed(() => this.connectRequests().length > 0);

    this.showBadge = ko.pureComputed(() => {
      return this.preferenceNotificationRepository.notifications().length > 0;
    });

    this.showRecentConversations = ko.observable(
      !this.propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS) ?? false,
    );
    this.expandedFoldersIds = ko.observableArray([]);

    this.showRecentConversations.subscribe(showRecentConversations => {
      const conversationList = document.querySelector('.conversation-list');
      if (conversationList) {
        conversationList.scrollTop = 0;
      }
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS, !showRecentConversations);
    });

    this.conversationState.activeConversation.subscribe(activeConversation => {
      if (!activeConversation) {
        return;
      }
      const activeLabelIds =
        this.conversationRepository.conversationLabelRepository.getConversationLabelIds(activeConversation);

      const isAlreadyOpen = activeLabelIds.some(labelId => this.expandedFoldersIds().includes(labelId));

      if (!isAlreadyOpen) {
        this.expandFolder(activeLabelIds[0]);
      }
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => {
        /**
         * We need all of those as trigger for the antiscroll update.
         * If we would just use
         * `this.unarchivedConversations() || this.webappIsLoaded() || this.connectRequests() || this.callingViewModel.activeCalls();`
         * it might return after the first truthy value and not monitor the remaining observables.
         */
        this.unarchivedConversations();
        this.webappIsLoaded();
        this.connectRequests();
        this.showRecentConversations();
        this.expandedFoldersIds();
        this.callingViewModel.activeCalls();
      })
      .extend({notify: 'always', rateLimit: 500});

    /*
     *  We generate a helper function to determine wether a <conversation-list-cell> is
     *  initially visible or not.
     *  We need this as we use an IntersectionObserver to improve rendering performance
     *  and only render cells as they become visible.
     *  If we would set them to be invisible initially on every render, we would get a
     *  lot of flickering every time the list updates.
     */
    this.getIsVisibleFunc = () => {
      const conversationList: HTMLElement = document.querySelector('.conversation-list');
      if (!conversationList) {
        return () => false;
      }
      const containerTop = conversationList.scrollTop;
      const containerBottom = containerTop + conversationList.offsetHeight;
      return (top: number, bottom: number) => bottom > containerTop && top < containerBottom;
    };

    this._initSubscriptions();
  }

  private readonly _initSubscriptions = (): void => {
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, this.onWebappLoaded);
    amplify.subscribe(WebAppEvents.SHORTCUT.START, this.clickOnPeopleButton);
    amplify.subscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, this.expandFolder);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) => {
      const viewFolders = properties.settings.interface.view_folders;
      this.showRecentConversations(!viewFolders);
    });
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.VIEW_FOLDERS, (viewFolders: boolean) => {
      this.showRecentConversations(!viewFolders);
    });
  };

  readonly expandFolder = (label: string) => {
    if (!this.expandedFoldersIds().includes(label)) {
      this.expandedFoldersIds.push(label);
    }
  };

  readonly clickOnAvailability = (viewModel: unknown, event: MouseEvent): void => {
    AvailabilityContextMenu.show(event, 'left-list-availability-menu');
  };

  readonly clickOnConnectRequests = (): void => {
    this.contentViewModel.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
  };

  readonly hasJoinableCall = (conversationId: string): boolean => {
    const call = this.callingRepository.findCall(conversationId);
    if (!call) {
      return false;
    }
    const conversation = this.conversationState.findConversation(conversationId);
    return (
      !conversation.removed_from_conversation() &&
      call.state() === CALL_STATE.INCOMING &&
      call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE
    );
  };

  readonly setShowCallsState = (handlingNotifications: string): void => {
    const shouldShowCalls = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.showCalls() !== shouldShowCalls;
    if (isStateChange) {
      this.showCalls(shouldShowCalls);
      this.logger.debug(`Set show calls state to: ${this.showCalls()}`);
    }
  };

  readonly isSelectedConversation = (conversationEntity: Conversation): boolean => {
    const expectedStates = [
      ContentViewModel.STATE.COLLECTION,
      ContentViewModel.STATE.COLLECTION_DETAILS,
      ContentViewModel.STATE.CONVERSATION,
    ];

    const isSelectedConversation = this.conversationState.isActiveConversation(conversationEntity);
    const isExpectedState = expectedStates.includes(this.contentState());

    return isSelectedConversation && isExpectedState;
  };

  readonly onWebappLoaded = (): void => {
    this.webappIsLoaded(true);
  };

  //##############################################################################
  // Footer actions
  //##############################################################################

  readonly clickOnArchivedButton = (): void => {
    this.listViewModel.switchList(ListViewModel.STATE.ARCHIVE);
  };

  readonly clickOnPreferencesButton = (): void => {
    amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
  };

  readonly clickOnPeopleButton = (): void => {
    if (this.isActivatedAccount()) {
      this.listViewModel.switchList(ListViewModel.STATE.START_UI);
    }
  };
}
