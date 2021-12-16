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

import React from 'react';
import cx from 'classnames';
import Icon from '../../../components/Icon';

interface PreferencesSectionProps extends React.HTMLProps<HTMLDivElement> {
  className?: string;
  hasSeparator?: boolean;
  onGoBack?: () => void;
  title?: string;
  uieName?: string;
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  title,
  className = '',
  uieName,
  hasSeparator,
  children,
  onGoBack,
}) => (
  <section className={`preferences-section ${className}`} data-uie-name={uieName}>
    {hasSeparator && <hr className="preferences-separator" />}
    {title && (
      <header className={cx('preferences-header', {'preferences-header--with-icon': !!onGoBack})}>
        {onGoBack && (
          <div className="preferences-header__icon" data-uie-name="go-back" onClick={onGoBack}>
            <Icon.ArrowLeft />
          </div>
        )}
        <span>{title}</span>
      </header>
    )}
    {children}
  </section>
);

export default PreferencesSection;
