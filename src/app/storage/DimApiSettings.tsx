import React, { useState } from 'react';
import './storage.scss';
import LocalStorageInfo from './LocalStorageInfo';
import { t } from 'app/i18next-t';
import ImportExport from './ImportExport';
import { apiPermissionGrantedSelector } from 'app/dim-api/selectors';
import { connect } from 'react-redux';
import { RootState, ThunkDispatchProp } from 'app/store/reducers';
import { setApiPermissionGranted } from 'app/dim-api/basic-actions';
import GoogleDriveSettings from './GoogleDriveSettings';
import { download } from 'app/utils/util';
import { SyncService } from './sync.service';
import { dataStats } from './data-stats';
import _ from 'lodash';
import { initSettings } from 'app/settings/settings';
import { importLegacyData, deleteAllApiData, loadDimApiData } from 'app/dim-api/actions';
import { UISref } from '@uirouter/react';
import { AppIcon, deleteIcon } from 'app/shell/icons';
import LegacyGoogleDriveSettings from './LegacyGoogleDriveSettings';
import HelpLink from 'app/dim-ui/HelpLink';
import { exportDimApiData } from 'app/dim-api/dim-api';

interface StoreProps {
  apiPermissionGranted: boolean;
}

function mapStateToProps(state: RootState): StoreProps {
  return {
    apiPermissionGranted: apiPermissionGrantedSelector(state)
  };
}

type Props = StoreProps & ThunkDispatchProp;

export const dimApiHelpLink =
  'https://github.com/DestinyItemManager/DIM/wiki/DIM-Sync-(new-storage-for-tags,-loadouts,-and-settings)';

function DimApiSettings({ apiPermissionGranted, dispatch }: Props) {
  // TODO: Show any sync errors here

  const [hasBackedUp, setHasBackedUp] = useState(false);

  const onApiPermissionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const granted = event.target.checked;
    dispatch(setApiPermissionGranted(granted));
    if (granted) {
      dispatch(loadDimApiData());
    }
  };

  const onExportData = async () => {
    setHasBackedUp(true);
    const data = await ($featureFlags.dimApi && apiPermissionGranted
      ? exportDimApiData()
      : SyncService.get());
    download(JSON.stringify(data), 'dim-data.json', 'application/json');
  };

  const onImportData = async (data: object) => {
    if ($featureFlags.dimApi && apiPermissionGranted) {
      if (confirm(t('Storage.ImportConfirmDimApi'))) {
        // TODO: At this point the legacy data is definitely out of sync
        await dispatch(importLegacyData(data, true));
        alert(t('Storage.ImportSuccess'));
      }
    } else {
      const stats = dataStats(data);

      const statsLine = _.map(
        stats,
        (value, key) => (value ? t(`Storage.${key}`, { value }) : undefined)
        // t('Storage.LoadoutsD1')
        // t('Storage.LoadoutsD2')
        // t('Storage.TagNotesD1')
        // t('Storage.TagNotesD2')
        // t('Storage.Settings')
        // t('Storage.IgnoredUsers')
      )
        .filter(Boolean)
        .join(', ');

      if (confirm(t('Storage.ImportConfirm', { stats: statsLine }))) {
        await SyncService.set(data, true);
        initSettings();
        alert(t('Storage.ImportSuccess'));
      }
    }
  };

  const deleteAllData = () => {
    if (apiPermissionGranted && !hasBackedUp) {
      alert(t('Storage.BackUpFirst'));
    } else if (confirm(t('Storage.DeleteAllDataConfirm'))) {
      dispatch(deleteAllApiData());
    }
  };

  // TODO: button to manually sync

  return (
    <section className="storage" id="storage">
      <h2>{t('Storage.MenuTitle')}</h2>

      <div className="setting">
        <div className="horizontal">
          <label htmlFor="apiPermissionGranted">
            {t('Storage.EnableDimApi')} <HelpLink helpLink={dimApiHelpLink} />
          </label>
          <input
            type="checkbox"
            id="apiPermissionGranted"
            name="apiPermissionGranted"
            checked={apiPermissionGranted}
            onChange={onApiPermissionChange}
          />
        </div>
        <div className="fineprint">{t('Storage.DimApiFinePrint')}</div>
      </div>
      {$featureFlags.dimApi && apiPermissionGranted && (
        <div className="setting horizontal">
          <label>{t('Storage.AuditLogLabel')}</label>
          <UISref to="audit">
            <a className="dim-button">{t('Storage.AuditLog')}</a>
          </UISref>
        </div>
      )}
      {$featureFlags.dimApi && (
        <div className="setting horizontal">
          <label>{t('Storage.DeleteAllDataLabel')}</label>
          <button className="dim-button" onClick={deleteAllData}>
            <AppIcon icon={deleteIcon} /> {t('Storage.DeleteAllData')}
          </button>
        </div>
      )}
      {(!$featureFlags.dimApi || !apiPermissionGranted) && <GoogleDriveSettings />}
      <LocalStorageInfo showDetails={!$featureFlags.dimApi || !apiPermissionGranted} />
      <ImportExport onExportData={onExportData} onImportData={onImportData} />
      {$featureFlags.dimApi && apiPermissionGranted && (
        <LegacyGoogleDriveSettings onImportData={onImportData} />
      )}
    </section>
  );
}

export default connect<StoreProps>(mapStateToProps)(DimApiSettings);
