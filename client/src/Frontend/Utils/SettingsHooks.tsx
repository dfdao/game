import { AutoGasSetting } from '@dfdao/types';
import React, { useCallback, useEffect, useState } from 'react';
import { ConditionalKeys } from 'type-fest';
import GameUIManager from '../../Backend/GameLogic/GameUIManager';
import { Settings } from '../../Backend/Storage/SettingStore';
import { SelectFrom } from '../Components/CoreUI';
import {
  Checkbox,
  ColorInput,
  DarkForestCheckbox,
  DarkForestColorInput,
  DarkForestNumberInput,
  DarkForestTextInput,
  NumberInput,
  TextInput,
} from '../Components/Input';

export const ALL_AUTO_GAS_SETTINGS = [
  AutoGasSetting.Slow,
  AutoGasSetting.Average,
  AutoGasSetting.Fast,
];

/**
 * Allows a react component to subscribe to changes and set the given setting.
 */
export function useSetting<Key extends keyof Settings, Value extends Settings[Key]>(
  uiManager: GameUIManager,
  setting: Key
): [Value, (newValue: Value) => void] {
  const settings = uiManager.getSettingStore();
  const [settingValue, setSettingValue] = useState(() => settings.get<Key, Value>(setting));

  useEffect(() => {
    return settings.subscribe((changedSetting) => {
      if (changedSetting === setting) {
        setSettingValue(settings.get<Key, Value>(setting));
      }
    });
  }, [settings, setSettingValue, setting]);

  return [
    settingValue,
    (newValue: Value) => {
      settings.set(setting, newValue);
    },
  ];
}

export function StringSetting({
  uiManager,
  setting,
  settingDescription,
}: {
  uiManager: GameUIManager;
  setting: ConditionalKeys<Settings, string>;
  settingDescription?: string;
}) {
  const [settingValue, setSettingValue] = useSetting(uiManager, setting);
  const onChange = useCallback(
    (e: Event & React.ChangeEvent<DarkForestTextInput>) => {
      setSettingValue(e.target.value);
    },
    [setSettingValue]
  );
  return (
    <>
      {settingDescription}
      <br />
      <TextInput value={settingValue} onChange={onChange} />
    </>
  );
}

export function ColorSetting({
  uiManager,
  setting,
  settingDescription,
}: {
  uiManager: GameUIManager;
  setting: ConditionalKeys<Settings, string>;
  settingDescription?: string;
}) {
  const [settingValue, setSettingValue] = useSetting(uiManager, setting);
  const onChange = useCallback(
    (e: Event & React.ChangeEvent<DarkForestColorInput>) => {
      setSettingValue(e.target.value);
    },
    [setSettingValue]
  );
  return (
    <>
      {settingDescription}
      <br />
      <ColorInput value={settingValue} onChange={onChange} />
    </>
  );
}

/**
 * React component that renders a checkbox representing the current value of this particular
 * setting, interpreting its value as a boolean. Allows the player to click on the checkbox to
 * toggle the setting. Toggling the setting both notifies the rest of the game that the given
 * setting was changed, and also saves it to local storage.
 */
export function BooleanSetting({
  uiManager,
  setting,
  settingDescription,
}: {
  uiManager: GameUIManager;
  setting: ConditionalKeys<Settings, boolean>;
  settingDescription?: string;
}) {
  const [settingValue, setSettingValue] = useSetting(uiManager, setting);

  return (
    <Checkbox
      label={settingDescription}
      checked={settingValue}
      onChange={(e: Event & React.ChangeEvent<DarkForestCheckbox>) =>
        setSettingValue(e.target.checked)
      }
    />
  );
}

export function NumberSetting({
  uiManager,
  setting,
}: {
  uiManager: GameUIManager;
  setting: ConditionalKeys<Settings, number>;
}) {
  const [settingValue, setSettingValue] = useSetting(uiManager, setting);

  return (
    <NumberInput
      format='float'
      value={settingValue}
      onChange={(e: Event & React.ChangeEvent<DarkForestNumberInput>) => {
        if (e.target.value) {
          setSettingValue(e.target.value);
        }
      }}
    />
  );
}

/**
 * UI that is kept in-sync with a particular setting which allows you to set that setting to one of
 * several options.
 */
export function MultiSelectSetting<Key extends keyof Settings, Value extends Settings[Key]>({
  uiManager,
  setting,
  values,
  labels,
  style,
  wide,
}: {
  uiManager: GameUIManager;
  setting: Key;
  values: Value[];
  labels: string[];
  style?: React.CSSProperties;
  wide?: boolean;
}) {
  const [settingValue, setSettingValue] = useSetting<typeof setting, Settings[typeof setting]>(
    uiManager,
    setting
  );

  return (
    <SelectFrom
      wide={wide}
      style={style}
      values={values}
      labels={labels}
      value={settingValue}
      setValue={setSettingValue}
    />
  );
}
