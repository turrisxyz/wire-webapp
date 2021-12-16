/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {useEffect, useState} from 'react';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {formatTimestamp} from 'Util/TimeUtil';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import useIsMounted from 'Util/useIsMounted';
import {getLogger} from 'Util/Logger';

import {ClientEntity} from '../../client/ClientEntity';
import DeviceId from '../../components/DeviceId';
import PreferencesPage from './components/PreferencesPage';
import PreferencesSection from './components/PreferencesSection';
import {Config} from '../../Config';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import {ClientRepository} from '../../client/ClientRepository';
import {ActionsViewModel} from '../../view_model/ActionsViewModel';
import {ConversationState} from '../../conversation/ConversationState';
import {MessageRepository} from '../../conversation/MessageRepository';
import {MotionDuration} from '../../motion/MotionDuration';

interface DeviceDetailsPreferencesProps {
  actionsViewModel: ActionsViewModel;
  clientRepository: ClientRepository;
  conversationState?: ConversationState;
  cryptographyRepository: CryptographyRepository;
  device: ClientEntity;
  messageRepository: MessageRepository;
}

enum SESSION_RESET_STATE {
  CONFIRMATION = 'confirmation',
  ONGOING = 'ongoing',
  RESET = 'reset',
}

const logger = getLogger('DeviceDetailsPreferences');

const DeviceDetailsPreferences: React.FC<DeviceDetailsPreferencesProps> = ({
  device,
  cryptographyRepository,
  clientRepository,
  actionsViewModel,
  messageRepository,
  conversationState = container.resolve(ConversationState),
}) => {
  const isMounted = useIsMounted();
  const [fingerprint, setFingerPrint] = useState('');
  const [state, setState] = useState(SESSION_RESET_STATE.RESET);

  const {selfUser} = useKoSubscribableChildren(clientRepository, ['selfUser']);
  const {isVerified} = useKoSubscribableChildren(device?.meta, ['isVerified']);
  const {self_conversation: selfConversation} = useKoSubscribableChildren(conversationState, ['self_conversation']);

  const config = Config.getConfig();

  useEffect(() => {
    cryptographyRepository
      .getRemoteFingerprint(selfUser, device.id)
      .then(remoteFingerprint => isMounted() && setFingerPrint(remoteFingerprint))
      .catch(error => {
        logger.warn('Error while trying to update fingerprint', error);
      });
  }, [selfUser, device]);

  const clickOnDetailsClose = () =>
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_DEVICES);

  const clickOnRemoveDevice = () => {
    actionsViewModel
      .deleteClient(device)
      .then(clickOnDetailsClose)
      .catch(error => logger.warn('Error while trying to remove device', error));
  };

  const clickOnResetSession = async (): Promise<void> => {
    setState(SESSION_RESET_STATE.ONGOING);
    const savelySetState = (newState: SESSION_RESET_STATE) => isMounted() && setState(newState);
    try {
      await messageRepository.resetSession(selfUser, device.id, selfConversation);
      window.setTimeout(() => savelySetState(SESSION_RESET_STATE.CONFIRMATION), MotionDuration.LONG);
      window.setTimeout(() => savelySetState(SESSION_RESET_STATE.RESET), 5000);
    } catch (error) {
      savelySetState(SESSION_RESET_STATE.RESET);
      throw error;
    }
  };

  return (
    <PreferencesPage title={t('preferencesDeviceDetails')}>
      <PreferencesSection title={t('preferencesDevices')} onGoBack={clickOnDetailsClose}>
        <div className="preferences-devices-model" data-uie-name="device-model">
          {device.getName()}
        </div>
        <div className="preferences-devices-id">
          <span>{t('preferencesDevicesId')}</span>
          <span data-uie-name="device-id">
            <DeviceId deviceId={device.id} />
          </span>
        </div>
        <div className="preferences-devices-activated">
          <div
            dangerouslySetInnerHTML={{__html: t('preferencesDevicesActivatedOn', {date: formatTimestamp(device.time)})}}
          />
        </div>
        <div className="preferences-devices-fingerprint-label">{t('preferencesDevicesFingerprint')}</div>
        <div className="preferences-devices-fingerprint">
          <DeviceId deviceId={fingerprint} />
        </div>
        <div className="preferences-devices-verification slider">
          <input
            className="slider-input"
            type="checkbox"
            name="preferences_device_verification_toggle"
            id="preferences_device_verification"
            checked={isVerified}
          />
          <label
            className="button-label"
            htmlFor="preferences_device_verification"
            data-uie-name="do-verify"
            onClick={() => clientRepository.verifyClient(selfUser, device, !isVerified)}
          >
            {t('preferencesDevicesVerification')}
          </label>
        </div>
        <div className="preferences-detail">{t('preferencesDevicesFingerprintDetail', config.BRAND_NAME)}</div>
      </PreferencesSection>
      <PreferencesSection hasSeparator />

      <PreferencesSection>
        <div className="preferences-info">{t('preferencesDevicesSessionDetail')}</div>
        <div className="preferences-devices-session" data-uie-name="preferences-device-details-session">
          {state === SESSION_RESET_STATE.RESET && (
            <button
              className="preferences-button button button-small button-fluid"
              onClick={clickOnResetSession}
              data-uie-name="do-session-reset"
            >
              {t('preferencesDevicesSessionReset')}
            </button>
          )}
          {state === SESSION_RESET_STATE.ONGOING && (
            <div className="preferences-devices-session-reset">{t('preferencesDevicesSessionOngoing')}</div>
          )}
          {state === SESSION_RESET_STATE.CONFIRMATION && (
            <div className="preferences-devices-session-confirmation accent-text">
              {t('preferencesDevicesSessionConfirmation')}
            </div>
          )}
        </div>
      </PreferencesSection>
      {!device.isLegalHold() && (
        <PreferencesSection>
          <div className="preferences-info">{t('preferencesDevicesRemoveDetail')}</div>
          <button
            className="preferences-button button button-small button-fluid"
            onClick={clickOnRemoveDevice}
            data-uie-name="go-remove-device"
          >
            {t('preferencesDevicesRemove')}
          </button>
        </PreferencesSection>
      )}
    </PreferencesPage>
  );
};

export default DeviceDetailsPreferences;

registerReactComponent('device-details-preferences', {
  component: DeviceDetailsPreferences,
  template: '<div data-bind="react: device: ko.unwrap(device)"></div>',
});
