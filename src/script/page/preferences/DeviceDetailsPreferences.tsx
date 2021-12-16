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

import React, {useState} from 'react';
import {t} from 'Util/LocalizerUtil';
import {ClientEntity} from '../../client/ClientEntity';
import DeviceId from '../../components/DeviceId';
import {useKoSubscribableChildren} from '../../util/ComponentUtil';
import PreferencesPage from './components/PreferencesPage';
import PreferencesSection from './components/PreferencesSection';

interface DeviceDetailsPreferencesProps {
  device: ClientEntity;
}

enum SESSION_RESET_STATE {
  CONFIRMATION = 'confirmation',
  ONGOING = 'ongoing',
  RESET = 'reset',
}

const DeviceDetailsPreferences: React.FC<DeviceDetailsPreferencesProps> = ({device}) => {
  const [fingerprint, setFingerPrint] = useState('');
  const {isVerified} = useKoSubscribableChildren(device?.meta, ['isVerified']);
  const [sessionResetState, setSessionResetState] = useState(SESSION_RESET_STATE.RESET);
  return (
    <PreferencesPage title={t('preferencesDeviceDetails')}>
      <section className="preferences-section">
        <header className="preferences-devices-details">
          <div
            className="preferences-devices-icon icon-back"
            data-bind="click: clickOnDetailsClose"
            data-uie-name="go-back"
          ></div>
          <span data-bind="text: t('preferencesDevices')"></span>
        </header>
        <div className="preferences-devices-model" data-uie-name="device-model">
          {device.getName()}
        </div>
        <div className="preferences-devices-id">
          <span data-bind="text: t('preferencesDevicesId')"></span>
          <span data-bind="foreach: device().formatId()" data-uie-name="device-id">
            <span className="device-id-part" data-bind="text: $data"></span>
          </span>
        </div>
        <div className="preferences-devices-activated">
          <div data-bind="html: activationDate()"></div>
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
            data-bind="click: toggleDeviceVerification"
            data-uie-name="do-verify"
          >
            {t('preferencesDevicesVerification')}
          </label>
        </div>
        <div className="preferences-detail" data-bind="text: t('preferencesDevicesFingerprintDetail', brandName)"></div>
      </section>
      <PreferencesSection hasSeparator />

      <section className="preferences-section">
        <div className="preferences-info" data-bind="text: t('preferencesDevicesSessionDetail')"></div>
        <div className="preferences-devices-session" data-uie-name="preferences-device-details-session">
          {sessionResetState === SESSION_RESET_STATE.RESET && (
            <button
              className="preferences-button button button-small button-fluid"
              data-bind="click: clickOnResetSession, text: t('preferencesDevicesSessionReset')"
              data-uie-name="do-session-reset"
            ></button>
          )}
          {sessionResetState === SESSION_RESET_STATE.ONGOING && (
            <div
              className="preferences-devices-session-reset"
              data-bind="text: t('preferencesDevicesSessionOngoing')"
            ></div>
          )}
          {sessionResetState === SESSION_RESET_STATE.CONFIRMATION && (
            <div
              className="preferences-devices-session-confirmation accent-text"
              data-bind="text: t('preferencesDevicesSessionConfirmation')"
            ></div>
          )}
        </div>
      </section>
      {!device.isLegalHold() && (
        <section className="preferences-section">
          <div className="preferences-info" data-bind="text: t('preferencesDevicesRemoveDetail')"></div>
          <button
            className="preferences-button button button-small button-fluid"
            data-bind="click: clickOnRemoveDevice, text: t('preferencesDevicesRemove')"
            data-uie-name="go-remove-device"
          ></button>
        </section>
      )}
    </PreferencesPage>
  );
};

export default DeviceDetailsPreferences;
